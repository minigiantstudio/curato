import { CaptureProvider } from '@/components/capture'
import { FAB } from '@/components/FAB'
import { SyncIndicator } from '@/components/SyncIndicator'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CaptureProvider>
      <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
        {children}
        <FAB />
        <SyncIndicator />
      </div>
    </CaptureProvider>
  )
}
