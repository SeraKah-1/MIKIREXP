
/**
 * ==========================================
 * KAOMOJI NOTIFICATION SERVICE (V2 - KAOMOJI.RU EDITION)
 * ==========================================
 * Layanan notifikasi yang lebih "manusiawi", lucu, dan ekspresif.
 */

const KAOMOJI = {
    HAPPY: ["( ◕ ‿ ◕ )", "(｡•̀ᴗ-)✧", "( b ᵔ ▽ ᵔ )b", "ヽ(・∀・)ﾉ"],
    CELEBRATE: ["(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧", "ヽ(⌐■_■)ノ♪♬", "°˖✧◝(⁰▿⁰)◜✧˖°", "＼(≧▽≦)／"],
    CONFUSED: ["( @ _ @ )", "(・_・;)", "┐( ˘_˘ )┌", "(O_O;)"],
    DETERMINED: ["( ง •̀ _ •́ )ง", "ᕙ(  •̀ ᗜ •́  )ᕗ", "(wu_wu)", "୧( ⁼̴̶̤̀ω⁼̴̶̤́ )૭"],
    SLEEPY: ["( ￣ o ￣ ) zzZ", "(－_－) zzZ", "(ρ_・).。", "(o´Д`o)ﾉ"],
    SHOCKED: ["( ⊙ _ ⊙ )", "Σ(O_O)", "(;;;*_*)", "щ(゜ロ゜щ)"],
    LOVE: ["( ♥ ◡ ♥ )", "( ˘ ³˘)♥", "(´ε｀ )♡", "(Zn_n)"],
    STUDY: ["( 📝 _ 📝 )", "(o_ _)o ⌨", "φ(．．;)", "( .. )φ"],
    ANGRY: ["( ≧Д≦)", "(fz_z)", "(╬ Ò﹏Ó)", "(ノ°Д°）ノ︵ ┻━┻"]
};

const getRandomKaomoji = (category: keyof typeof KAOMOJI) => {
    const list = KAOMOJI[category];
    return list[Math.floor(Math.random() * list.length)];
};
  
export const requestKaomojiPermission = async (): Promise<boolean> => {
    if (!("Notification" in window)) return false;
    
    try {
        if (Notification.permission === "granted") return true;
        if (Notification.permission !== "denied") {
            const permission = await Notification.requestPermission();
            return permission === "granted";
        }
    } catch (e) {
        console.warn("Notification permission error:", e);
        return false;
    }
    return false;
};

const sendKaomojiNotify = (title: string, body: string, tag?: string) => {
    if (!("Notification" in window)) return;

    if (Notification.permission === "granted") {
        try {
            // Try ServiceWorker first (Mobile Support)
            if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
                navigator.serviceWorker.ready.then(registration => {
                    registration.showNotification(title, {
                        body: body,
                        icon: "https://cdn-icons-png.flaticon.com/512/3767/3767084.png",
                        tag: tag,
                        vibrate: [200, 100, 200]
                    } as any);
                }).catch(() => fallbackNotify(title, body, tag));
            } else {
                fallbackNotify(title, body, tag);
            }
        } catch (e) {
            console.warn("Notification failed:", e);
        }
    }
};

const fallbackNotify = (title: string, body: string, tag?: string) => {
    try {
        new Notification(title, {
            body: body,
            icon: "https://cdn-icons-png.flaticon.com/512/3767/3767084.png", 
            tag: tag
        });
    } catch (e) {
        console.warn("Notification constructor failed.");
    }
}

// --- SPECIFIC TRIGGERS ---

export const notifyQuizReady = (questionCount: number) => {
    sendKaomojiNotify(
        `${getRandomKaomoji('CELEBRATE')} Quiz Siap!`,
        `${questionCount} soal panas baru saja keluar dari oven AI. Sikat sekarang!`,
        'quiz-ready'
    );
};

export const notifySupabaseSuccess = () => {
    sendKaomojiNotify(
        `${getRandomKaomoji('LOVE')} Awan Terhubung!`,
        `Database Supabase connect. Data kamu aman, gak bakal ilang ditelan bumi.`,
        'supabase-connect'
    );
};

export const notifySupabaseError = () => {
    sendKaomojiNotify(
        `${getRandomKaomoji('ANGRY')} Koneksi Putus...`,
        `Kunci Supabase-nya salah atau server lagi ngambek. Cek setting lagi ya.`,
        'supabase-error'
    );
};

export const notifyReviewDue = (count: number) => {
    sendKaomojiNotify(
        `${getRandomKaomoji('DETERMINED')} Waktunya Setor Hafalan!`,
        `Ada ${count} kartu yang otakmu mulai lupa. Review 5 menit biar jadi long-term memory!`,
        'srs-due'
    );
};

export const notifyStudyReminder = () => {
    sendKaomojiNotify(
        `${getRandomKaomoji('STUDY')} Alarm Belajar!`,
        `Udah janji kan mau pinter? Yuk login sebentar, kerjain satu quiz aja.`,
        'daily-reminder'
    );
};
