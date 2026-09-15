import { redirect } from 'next/navigation';

/** The contact form list moved to /admin/requests; old notification links still point here. */
export default function AdminContactRedirect() {
  redirect('/admin/requests');
}
