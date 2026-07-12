const { chromium } = require('playwright');

// Data akun yang disiapkan untuk testing
// Ganti dengan data akun yang valid di platform Plugo yang sedang Anda tes
const accounts = [
    { email: 'tester1@contoh.com', password: 'Password123!' },
    { email: 'tester2@contoh.com', password: 'Password123!' },
];

// URL target (Ganti dengan URL toko Plugo yang akan dites)
const TARGET_LOGIN_URL = 'https://contoh-toko-plugo.com/login';

async function runBot() {
    console.log("Memulai proses testing bot...\n");
    
    // Jalankan browser. 
    // headless: false -> agar kita bisa melihat bot beraksi di layar
    // slowMo: 50 -> memberi jeda 50ms di setiap aksi agar terlihat lebih natural (seperti manusia)
    const browser = await chromium.launch({ headless: false, slowMo: 50 }); 
    
    for (const acc of accounts) {
        console.log(`\n=========================================`);
        console.log(`Mencoba login dengan: ${acc.email}`);
        
        // Buka context baru (seperti mode incognito yang bersih dari cookies/cache)
        const context = await browser.newContext({
            // Menyamarkan user agent agar terlihat seperti browser Chrome biasa
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        });
        const page = await context.newPage();

        try {
            // 1. Pergi ke halaman login target
            console.log(`-> Membuka halaman login...`);
            await page.goto(TARGET_LOGIN_URL, { waitUntil: 'networkidle' });

            // 2. Isi form email (Sesuaikan selectornya dengan web target)
            console.log(`-> Mengetik email...`);
            // Biasanya Plugo menggunakan input type email atau name email
            await page.fill('input[type="email"], input[name="email"]', acc.email);
            
            // 3. Isi form password
            console.log(`-> Mengetik password...`);
            await page.fill('input[type="password"], input[name="password"]', acc.password);

            // Jeda sedikit agar tidak terlalu instan (seolah-olah manusia sedang berpikir/melihat)
            await page.waitForTimeout(1000); 

            // 4. Klik tombol submit / login
            console.log(`-> Mengklik tombol login...`);
            // Mencari tombol yang memiliki text "Login" atau "Masuk" atau type="submit"
            await page.click('button[type="submit"], button:has-text("Login"), button:has-text("Masuk")');

            // 5. Tunggu proses loading selesai
            console.log(`-> Menunggu response...`);
            await page.waitForTimeout(4000); // Tunggu 4 detik untuk melihat hasilnya

            // Opsional: Screenshot hasilnya untuk bukti testing
            await page.screenshot({ path: `hasil-login-${acc.email}.png` });
            console.log(`✅ Selesai testing untuk: ${acc.email} (Screenshot tersimpan)`);
            
        } catch (error) {
            console.error(`❌ Gagal atau ada error saat testing ${acc.email}:`);
            console.error(error.message);
        } finally {
            // Tutup tab setelah selesai
            await context.close();
        }
    }

    await browser.close();
    console.log("\n=========================================");
    console.log("✅ Semua testing selesai!");
}

runBot();
