// app/vendor/layout.js
import Sidebar from './components/Sidebar';

export default function VendorLayout({ children }) {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: '280px 1fr',
            minHeight: '100vh',
            background: '#0a0e27',
            color: '#e0e6ed',
        }}>
            <aside style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
                <Sidebar />
            </aside>

            <main style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                {children}
            </main>
        </div>
    );
}
