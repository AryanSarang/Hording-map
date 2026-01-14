'use client';

import Sidebar from '../components/Sidebar';
import styles from '../hordings/hordings.module.css';

export default function MetafieldsPage() {
    return (
        <div className={styles.container}>
            <Sidebar />

            <main className={styles.main}>
                <div className={styles.topbar}>
                    <h1 className={styles.title}>⚙️ Metafields</h1>
                </div>

                <div className={styles.content}>
                    <div className={styles.section}>
                        <p className={styles.comingSoon}>Metafields management coming soon...</p>
                    </div>
                </div>
            </main>
        </div>
    );
}
