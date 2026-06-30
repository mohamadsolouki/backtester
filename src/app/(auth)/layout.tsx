export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#061b20] p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-[28px] font-semibold tracking-[-0.01em] text-white">
            Trade <span className="text-[#18c8bd]">OS</span>
          </h1>
          <p className="mt-1 text-[14px] text-white/60">Trading Intelligence Platform</p>
        </div>
        {children}
      </div>
    </div>
  );
}
