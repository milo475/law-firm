import { RequestMethod, type Type } from '@nestjs/common';
import { METHOD_METADATA, MODULE_METADATA, PATH_METADATA } from '@nestjs/common/constants';
import type { Role } from '@law-firm/shared';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Reads the API's own routing table out of the module graph, so a test can ask questions about
 * every route Nest registers instead of a list somebody remembered to update.
 */

export interface ApiRoute {
  /** `GET /posts/manage` — how a test names a route. */
  key: string;
  method: 'get' | 'post' | 'patch' | 'put' | 'delete';
  /** The path with every `:param` filled in, ready to call. */
  url: string;
  controller: Type;
  /** The roles the guard will require (a handler's own list wins over the controller's). */
  roles: Role[];
  isPublic: boolean;
}

const ANY_ID = '00000000-0000-4000-8000-000000000000';

/** Every controller Nest would register, walking imports from the root module. */
export function collectControllers(module: unknown, seen = new Set<unknown>()): Type[] {
  const target = unwrapModule(module);
  if (!target || seen.has(target)) return [];
  seen.add(target);
  const own = [
    ...((Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, target) as Type[] | undefined) ?? []),
    ...(((module as { controllers?: Type[] }).controllers as Type[] | undefined) ?? []),
  ];
  const imports = [
    ...((Reflect.getMetadata(MODULE_METADATA.IMPORTS, target) as unknown[] | undefined) ?? []),
    ...(((module as { imports?: unknown[] }).imports as unknown[] | undefined) ?? []),
  ];
  return [...new Set([...own, ...imports.flatMap((imported) => collectControllers(imported, seen))])];
}

/** A module entry is a class, a dynamic module (`{ module }`) or a forwardRef. */
function unwrapModule(module: unknown): Type | null {
  if (typeof module === 'function') return module as Type;
  if (module && typeof module === 'object') {
    const wrapper = module as { module?: Type; forwardRef?: () => Type };
    if (typeof wrapper.forwardRef === 'function') return wrapper.forwardRef();
    if (wrapper.module) return wrapper.module;
  }
  return null;
}

/** The routes one controller registers, with their effective guard metadata. */
export function routesOf(controller: Type): ApiRoute[] {
  const prefix = segment(Reflect.getMetadata(PATH_METADATA, controller) as string | undefined);
  const classRoles = Reflect.getMetadata(ROLES_KEY, controller) as Role[] | undefined;
  const classPublic = Reflect.getMetadata(IS_PUBLIC_KEY, controller) as boolean | undefined;
  const prototype = controller.prototype as Record<string, unknown>;

  return Object.getOwnPropertyNames(prototype)
    .filter((name) => name !== 'constructor')
    .flatMap((name) => {
      const handler = prototype[name];
      if (typeof handler !== 'function') return [];
      const path = Reflect.getMetadata(PATH_METADATA, handler) as string | undefined;
      const verb = Reflect.getMetadata(METHOD_METADATA, handler) as number | undefined;
      if (path === undefined || verb === undefined) return [];
      const full = [prefix, segment(path)].filter(Boolean).join('/');
      return [
        {
          key: `${RequestMethod[verb]} /${full}`,
          method: RequestMethod[verb].toLowerCase() as ApiRoute['method'],
          url: `/${full}`.replace(/:[^/]+/g, ANY_ID),
          controller,
          roles: (Reflect.getMetadata(ROLES_KEY, handler) as Role[] | undefined) ?? classRoles ?? [],
          isPublic: ((Reflect.getMetadata(IS_PUBLIC_KEY, handler) as boolean | undefined) ?? classPublic) === true,
        },
      ];
    });
}

/** Every route in the application, in one call. */
export function apiRoutes(rootModule: Type): ApiRoute[] {
  return collectControllers(rootModule).flatMap(routesOf);
}

/**
 * Controllers booted without their services: a guard runs before anything they would call, so an
 * empty object is enough to construct them.
 */
export function mockDependencies(controllers: Type[]): { provide: Type; useValue: object }[] {
  const dependencies = new Set<Type>();
  for (const controller of controllers) {
    const types = (Reflect.getMetadata('design:paramtypes', controller) as Type[] | undefined) ?? [];
    for (const type of types) if (typeof type === 'function' && type !== Object) dependencies.add(type);
  }
  return [...dependencies].map((provide) => ({ provide, useValue: {} }));
}

function segment(path: string | undefined): string {
  return (path ?? '').replace(/^\/+|\/+$/g, '');
}
