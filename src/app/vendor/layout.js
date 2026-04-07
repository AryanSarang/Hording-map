// app/vendor/layout.js
import Sidebar from './components/Sidebar';
import shell from './vendorShell.module.css';

export default function VendorLayout({ children }) {
    return (
        <div className={shell.layoutRoot}>
            <aside style={{ position: 'sticky', top: 0, height: '100vh', overflow: 'hidden' }}>
                <Sidebar />
            </aside>

            <main className={shell.main}>
                {children}
            </main>
        </div>
    );
}
