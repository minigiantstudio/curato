import { CaptureProvider } from '@/components/capture'
import { FAB } from '@/components/FAB'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CaptureProvider>
      <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
        {children}
        <FAB />
      </div>
    </CaptureProvider>
  )
}
