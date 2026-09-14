import { MessagesIcon } from '@/components/icons';
import { EmptyState } from '@/components/ui/states';

export default function MessagesPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-h3">Мессеж</h2>
        <p className="mt-1 text-body-sm text-text-secondary">Хуульчтайгаа портал дээрээс шууд харилцах хэсэг.</p>
      </div>
      <EmptyState icon={<MessagesIcon size={24} />} title="Тун удахгүй" description="Мессежийн үйлчилгээ удахгүй нээгдэнэ. Одоогоор хариуцсан хуульчтайгаа и-мэйл, утсаар холбогдоно уу." />
    </div>
  );
}
