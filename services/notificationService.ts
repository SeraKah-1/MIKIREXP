/**
 * ==========================================
 * BROWSER NOTIFICATION & SCHEDULING SERVICE
 * ==========================================
 */

const REMINDER_KEY = 'glassquiz_reminder_time';

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    alert("Browser ini tidak mendukung notifikasi desktop.");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

export const scheduleDailyReminder = (time: string) => { // format "HH:MM"
  localStorage.setItem(REMINDER_KEY, time);
  
  // Send immediate feedback
  if (Notification.permission === "granted") {
    new Notification("Pengingat Diaktifkan! ⏰", {
      body: `Mikir (-•_•) akan mengingatkanmu setiap hari jam ${time}.`,
      icon: "https://cdn-icons-png.flaticon.com/512/3767/3767084.png" // Generic study icon
    });
  }
};

export const getReminderTime = (): string | null => {
  return localStorage.getItem(REMINDER_KEY);
};

export const checkAndTriggerNotification = () => {
  const savedTime = getReminderTime();
  if (!savedTime || Notification.permission !== "granted") return;

  const now = new Date();
  const [targetHours, targetMinutes] = savedTime.split(':').map(Number);
  
  const lastTriggerDate = localStorage.getItem('glassquiz_last_notification_date');
  const todayStr = now.toDateString();

  // If already triggered today, skip
  if (lastTriggerDate === todayStr) return;

  const targetTime = new Date();
  targetTime.setHours(targetHours, targetMinutes, 0, 0);

  // If now is later than target time
  if (now >= targetTime) {
      new Notification("Waktunya Belajar! 📚", {
        body: "Target harianmu belum tercapai. Yuk kerjakan 1 kuis sekarang!",
        requireInteraction: true,
      });
      localStorage.setItem('glassquiz_last_notification_date', todayStr);
  }
};

/**
 * Generates and downloads an .ics file for calendar integration
 */
export const downloadICSFile = (time: string, topic: string = "Materi Umum") => {
  const [hours, minutes] = time.split(':');
  
  // Create a date for today at the specified time
  const startDate = new Date();
  startDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  
  // End time is 30 minutes later
  const endDate = new Date(startDate.getTime() + 30 * 60000);

  // Format date to ICS format: YYYYMMDDTHHMMSSZ
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Mikir App//Study Scheduler//ID',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    'RRULE:FREQ=DAILY', // Daily recurrence
    `SUMMARY:Belajar Rutin: ${topic}`,
    'DESCRIPTION:Waktunya mengasah otak di aplikasi Mikir (-•_•)! Jangan lupa review materi hari ini.',
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT10M', // Alarm 10 minutes before
    'DESCRIPTION:Persiapan Belajar',
    'ACTION:DISPLAY',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.setAttribute('download', 'jadwal_belajar_mikir.ics');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};