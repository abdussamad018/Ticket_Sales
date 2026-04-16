export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 bg-white text-black dark:bg-white dark:text-black">
      <div className="mx-auto w-full max-w-5xl px-4 py-6">{children}</div>
    </div>
  );
}

