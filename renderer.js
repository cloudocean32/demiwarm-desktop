// =================================================================
//                      STATE & KONFIGURASI
// =================================================================

const state = {
  accounts: {},
  topicRooms: {},
  statusUpdateInterval: null,
};

const statusDisplays = {
  Online:   { emoji: '🟢', color: 'var(--primary-color)' },
  Busy:     { emoji: '🟠', color: 'var(--warning)' },
  Idle:     { emoji: '⚪', color: 'var(--text-muted-light)' },
  Sleeping: { emoji: '😴', color: 'var(--text-muted-light)' },
  Ready:    { emoji: '✨', color: 'var(--text-muted-light)' }
};

const jobSchedules = {
    'Karyawan Kantor': {
        weekdays: { wa: [[6, 6.25], [12, 12.5], [20, 22.5]], busy: [[7.5, 12], [13, 17], [17, 18.5]], sleep: [[22.5, 6]] },
        saturday: { wa: [[8.5, 9], [12, 12.5], [19, 19.5]], busy: [[9, 12], [13, 19]], sleep: [[23, 7]] },
        sunday: { wa: [[9, 12], [15, 18]], busy: [[13, 15]], sleep: [[0, 8]] }
    },
    'Freelancer': {
        weekdays: { wa: [[8, 8.5], [11, 11.25], [14.5, 14.75], [17.25, 17.5], [20, 20.5]], busy: [[9, 11], [12, 14.5], [15, 17], [18, 20]], sleep: [[2, 8]] },
        sunday: { wa: [[10, 12], [16, 18]], busy: [[13, 15]], sleep: [[2, 9]] }
    },
    'Pekerja Toko': {
        weekdays: { wa: [[5, 5.25], [9.25, 9.5], [12.5, 13], [16.25, 16.5], [19, 19.5]], busy: [[7, 9], [10, 12.5], [14, 16], [17, 19]], sleep: [[21.5, 4.5]] },
        sunday: { wa: [[8, 10], [14, 16]], busy: [[11, 13]], sleep: [[22, 5]] }
    },
    'Tenaga Medis': {
        weekdays: { wa: [[6, 6.25], [10.25, 10.5], [13, 13.5], [17.25, 17.5], [21, 21.25]], busy: [[7, 10], [11, 13], [14, 17], [18, 21]], sleep: [[22, 5]] },
        sunday: { wa: [[7, 7.5], [12, 12.5], [17, 17.5]], busy: [[8, 12], [13, 17]], sleep: [[23, 6]] }
    },
    'Pelajar': {
        weekdays: { wa: [[5.5, 6], [12, 12.5], [15, 15.25], [18.5, 19], [21, 21.5]], busy: [[7, 12], [13, 15], [16, 18]], sleep: [[2, 5]] },
        saturday: { wa: [[7, 7.5], [12.5, 13], [16, 16.5], [19.5, 20]], busy: [[8, 12], [14, 16]], sleep: [[23, 6]] },
        sunday: { wa: [[9, 12], [15, 18]], busy: [[13, 15]], sleep: [[0, 8]] }
    },
    'Pengangguran': {
        default: { 
            wa: [[9.5, 12], [13, 17], [19, 21], [2, 4]], 
            busy: [[21, 2]], 
            sleep: [[4, 9]] 
        }
    }
};

const personalityModels = {
    'Si Ramah': "Gaya bahasamu sangat ramah, sopan, dan hangat. Sering menggunakan emoji seperti 😊🙏👍. Selalu mulai dengan sapaan dan akhiri dengan sopan.",
    'Santai & Slang': "Gaya bahasamu sangat kasual, gunakan slang (bro, wkwk, gas), dan jangan terlalu formal dengan tanda baca.",
    'Si Penasaran': "Gaya bahasamu penuh rasa ingin tahu. Sering ajukan pertanyaan lanjutan (Kok bisa?, Trus gimana?, Kenapa?) dan berikan balasan yang detail.",
    'Pendiam & Bijaksana': "Gaya bahasamu singkat, padat, dan hati-hati dalam memilih kata. Jarang sekali pakai emoji. Kadang berikan nasihat atau pandangan yang mendalam.",
    'Si Cerewet': "Gaya bahasamu sangat ekspresif dan suka bercerita panjang. Terkadang ada typo karena mengetik cepat.",
    'Cuek & Singkat': "Gaya bahasamu sangat singkat dan seperlunya (Ok, Y, Gk). Balas pesan dengan jeda yang lebih lama dan abaikan formalitas.",
    'Si Overthinking': "Gaya bahasamu menunjukkan keraguan dan sering bertanya untuk konfirmasi (Kamu marah ya?, Beneran boleh???). Gunakan tanda baca berlebihan dan sering minta maaf.",
    'Si Motivator': "Gaya bahasamu penuh semangat dan positif. Sering berikan kata-kata penyemangat (Kamu pasti bisa!), pujian (Mantap!)."
};

// =================================================================
//                        ELEMENTS & TEMPLATES
// =================================================================

const windowsContainer = document.getElementById('windowsContainer');
const statusBar = document.getElementById('statusBar');
const nameModalTemplate = document.getElementById('nameModalTemplate');
const roomModalTemplate = document.getElementById('roomModalTemplate');
const roomContainerTemplate = document.getElementById('roomContainerTemplate');

// =================================================================
//                        FUNGSI UTILITAS
// =================================================================

function updateStatus(msg, type = 'info') {
  statusBar.textContent = msg;
  const colors = { success: '#2ecc71', error: '#e74c3c', processing: '#f39c12', info: '#666' };
  statusBar.style.color = colors[type] || colors.info;
}

function formatMessage(text) {
    if (!text) return "";
    let cleanedText = text.trim();
    cleanedText = cleanedText.replace(/^\s*[\w\s]+:\s*/, '');
    if ((cleanedText.startsWith('"') && cleanedText.endsWith('"')) || (cleanedText.startsWith("'") && cleanedText.endsWith("'"))) {
        cleanedText = cleanedText.substring(1, cleanedText.length - 1);
    }
    cleanedText = cleanedText.replace(/(\b\w+)\s*-\s*(\1)\b/gi, '$12');
    cleanedText = cleanedText.replace(/[!?.,-]{2,}/g, (match) => match[0]);
    return cleanedText.trim();
}

function isTimeInRanges(currentTime, ranges) {
    if (!ranges) return false;
    for (const range of ranges) {
        const [start, end] = range;
        if (start > end) {
            if (currentTime >= start || currentTime < end) return true;
        } else {
            if (currentTime >= start && currentTime < end) return true;
        }
    }
    return false;
}

function getAccountStatus(account) {
    if (!account || !account.job) return "Idle";
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = now.getHours() + now.getMinutes() / 60;
    const jobData = jobSchedules[account.job];
    const dayName = ['sunday', 'weekdays', 'weekdays', 'weekdays', 'weekdays', 'weekdays', 'saturday'][dayOfWeek];
    const schedule = jobData[dayName] || jobData.weekdays || jobData.default;
    if (schedule) {
        if (isTimeInRanges(currentTime, schedule.sleep)) return "Sleeping";
        if (isTimeInRanges(currentTime, schedule.busy)) return "Busy";
        if (isTimeInRanges(currentTime, schedule.wa)) return "Online";
    }
    return "Idle";
}

function updateAccountUI(accountId, updates) {
    if (!accountId) return;
    if (updates.actionStatus !== undefined) {
        const el = document.getElementById(`action-status-${accountId}`);
        if (el) el.textContent = updates.actionStatus;
    }
    if (updates.chatPreview !== undefined) {
        const el = document.getElementById(`chat-${accountId}`);
        if (el) el.innerHTML = updates.chatPreview;
    }
    if (updates.timestamp !== undefined) {
        const el = document.getElementById(`timestamp-${accountId}`);
        if (el) el.textContent = updates.timestamp;
    }
}

// =================================================================
//                       LOGIKA INTI OTOMASI
// =================================================================

function updatePersistentStatusUI(accountId) {
    const account = state.accounts[accountId];
    const persistentStatusEl = document.getElementById(`status-${accountId}`);
    if (account && persistentStatusEl) {
        const currentStatus = getAccountStatus(account);
        const displayInfo = statusDisplays[currentStatus] || statusDisplays.Idle;
        persistentStatusEl.innerHTML = `${displayInfo.emoji} ${currentStatus}`;
        persistentStatusEl.style.color = displayInfo.color;
    }
}

function updateAllAccountStatuses() {
    for (const accountId in state.accounts) {
        const account = state.accounts[accountId];
        if (!account) continue;
        const room = state.topicRooms[account.roomId];
        if (!room || !room.isAutomationRunning) continue;
        const actionStatusEl = document.getElementById(`action-status-${accountId}`);
        if (actionStatusEl && actionStatusEl.textContent.trim() === '') {
            updatePersistentStatusUI(accountId);
        }
    }
}

async function isConversationStuck(history) {
    if (history.length < 4) return false;
    const recentChat = history.slice(-4).map(item => `- ${item.sender}: "${item.message}"`).join('\n');
    // PERUBAHAN: Menambahkan aturan bahasa
    const prompt = `Analisa percakapan berikut:\n${recentChat}\n\nPertanyaan: Apakah inti percakapan ini hanya berputar-putar pada topik yang sama tanpa kemajuan? Jawab HANYA dengan "YA" atau "TIDAK".\n\nATURAN MUTLAK: Jawaban Anda HARUS dalam Bahasa Indonesia.`;
    try {
        const response = await window.electronAPI.askAI(prompt);
        return response.trim().toUpperCase() === 'YA';
    } catch (error) {
        console.error("AI failed to check conversation loop:", error);
        return false;
    }
}

async function generateRelatedSubtopic(parentTopic, recentMessages, senderName) {
  const lastTopics = recentMessages.slice(-3).map(m => m.message).join('\n');
  // PERUBAHAN: Menambahkan aturan bahasa
  const prompt = `Anda adalah ${senderName}. Topik utama adalah "${parentTopic}".\nPercakapan terakhir terasa buntu:\n${lastTopics}\n\nBuat satu kalimat pertanyaan atau pernyataan untuk memulai subtopik BARU yang masih relevan dengan "${parentTopic}" untuk memecah kebuntuan. Langsung tulis kalimatnya.\n\nATURAN MUTLAK: Jawaban Anda HARUS SELALU dalam Bahasa Indonesia.`;
  try {
    return await window.electronAPI.askAI(prompt);
  } catch (error) {
    console.error("AI gagal generate subtopik:", error);
    return `Ngomong-ngomong soal ${parentTopic}, ada hal menarik apa lagi ya?`;
  }
}

function generateDynamicPrompt(lastMessage, senderName, receiverName, history, topic, personality, chatStyle, rules, job) {
  const isFirstMessage = !lastMessage || lastMessage === "";
  const historyContext = history.slice(-3).map(m => `${m.sender}: ${m.message}`).join('\n');
  let instruction;
  if (isFirstMessage) {
    instruction = `Anda adalah ${senderName}, seorang ${job}. Mulai percakapan 1-on-1 dengan ${receiverName} tentang topik "${topic}".`;
  } else {
    instruction = `Anda adalah ${senderName}, seorang ${job}. Balas pesan terakhir dari ${receiverName} ini: "${lastMessage}"`;
  }
  
  // PERUBAHAN: Menambahkan aturan bahasa yang lebih tegas
  const finalRules = [
      "TULIS JAWABAN LANGSUNG (hanya isi pesannya), TANPA awalan nama.", 
      "Fokus HANYA membalas satu pesan terakhir.", 
      "Gaya bahasa dan kepribadian Anda: " + personality, 
      ...rules,
      "ATURAN MUTLAK: Balasan Anda HARUS SELALU dalam Bahasa Indonesia. Jangan pernah menggunakan bahasa lain selain Indonesia, bahkan jika riwayat chat berisi bahasa lain. Ini adalah aturan terpenting."
  ];
  
  return [instruction, "\n---", "Riwayat singkat sebagai konteks (jangan diulang dalam jawaban):", historyContext || "(Belum ada riwayat)", "\n---", "Aturan WAJIB:", ...finalRules].join('\n');
}

function dynamicDelayFromMessage(msg, delaySettings, job, lastStatus, senderName) {
    const { delayMin, delayMax } = delaySettings;
    const len = msg?.length || 0;
    const now = new Date();
    const dayOfWeek = now.getDay();
    const currentTime = now.getHours() + now.getMinutes() / 60;
    
    console.log(`[DEBUG] Job: ${job}, Day: ${dayOfWeek}, CurrentTime: ${currentTime.toFixed(2)}`);
    
    const dayName = ['sunday', 'weekdays', 'weekdays', 'weekdays', 'weekdays', 'weekdays', 'saturday'][dayOfWeek];
    const jobData = jobSchedules[job];
    const schedule = jobData ? (jobData[dayName] || jobData.weekdays || jobData.default) : null;

    let delayFactor = 1.0;
    let longPause = 0;
    let currentStatus = "Idle";

    if (schedule) {
        if (isTimeInRanges(currentTime, schedule.sleep)) currentStatus = "Sleeping";
        else if (isTimeInRanges(currentTime, schedule.busy)) currentStatus = "Busy";
        else if (isTimeInRanges(currentTime, schedule.wa)) currentStatus = "Online";
    }
    
    if (currentStatus === "Sleeping") {
        return { delay: 0, status: currentStatus };
    } else if (currentStatus === "Busy") {
        const QUICK_REPLY_CHANCE_WHILE_BUSY = 0.20; 
        if (Math.random() > QUICK_REPLY_CHANCE_WHILE_BUSY) {
            longPause = 180000 + Math.random() * 720000; 
        }
    } else if (currentStatus === "Online") {
        delayFactor = 0.5;
        const DISTRACTION_CHANCE = 0.30;
        if (Math.random() < DISTRACTION_CHANCE) {
            longPause = 60000 + Math.random() * 180000; 
        }
    }

    if (lastStatus === 'Busy' && currentStatus === 'Online') {
        delayFactor *= 5;
    }

    const baseDelay = delayMin + Math.random() * (delayMax - delayMin);
    const readingDelay = len * (30 + Math.random() * 20);
    const finalDelay = (baseDelay + readingDelay) * delayFactor + longPause;

    console.log(`⏳ Delay (${senderName} - ${job} - ${currentStatus}): ${Math.round(finalDelay / 1000)}s`);
    return { delay: finalDelay, status: currentStatus };
}

function createPairsInRoom(room) {
    const shuffledMembers = [...room.members].sort(() => 0.5 - Math.random());
    room.pairs = [];
    for (let i = 0; i < shuffledMembers.length - 1; i += 2) {
        const pairMembers = [shuffledMembers[i], shuffledMembers[i + 1]];
        room.pairs.push({
            id: `pair-${pairMembers.join('-')}`,
            members: pairMembers,
            history: [],
            lastMessage: '',
            nextSpeakerId: pairMembers[0],
            recentlySwitchedTopic: false,
            lastStatus: 'Idle',
            unansweredMessages: 0,
            followUpLevel: 0,
            conversationPausedBySleep: false,
            isPaused: false
        });
    }
    if (shuffledMembers.length % 2 !== 0) {
        const leftover = shuffledMembers[shuffledMembers.length - 1];
        console.log(`Akun "${state.accounts[leftover]?.name}" tidak memiliki pasangan di Room "${room.topic}" untuk sesi ini.`);
    }
}

async function runSingleTurnForPair(pair, room) {
    try {
        const senderId = pair.nextSpeakerId;
        const receiverId = pair.members.find(id => id !== senderId);
        if (!senderId || !receiverId) return;
        const sender = state.accounts[senderId];
        const receiver = state.accounts[receiverId];
        if (!sender || !receiver) return;

        const lastHistoryEntry = pair.history[pair.history.length - 1];
        if (pair.isPaused && sender.name === lastHistoryEntry?.sender) {
            return;
        }
        
        if (pair.conversationPausedBySleep && lastHistoryEntry && sender.name === lastHistoryEntry.receiver) {
            const senderStatus = getAccountStatus(sender);
            if (senderStatus !== 'Sleeping') {
                updateAccountUI(senderId, { actionStatus: 'Waking up...' });
                // PERUBAHAN: Menambahkan aturan bahasa
                const wakeUpPrompt = `Anda adalah ${sender.name}. Balas pesan dari ${receiver.name} yang sepertinya dikirim saat Anda tidur. Pesannya: "${lastHistoryEntry.message}". Minta maaf karena baru balas karena ketiduran, lalu tanggapi pesannya. ATURAN MUTLAK: Balasan Anda HARUS SELALU dalam Bahasa Indonesia.`;
                let aiText = await window.electronAPI.askAI(wakeUpPrompt);
                aiText = formatMessage(aiText);
                await new Promise(resolve => setTimeout(resolve, 5000 + Math.random() * 5000));
                await window.electronAPI.sendMessage({ senderWindowId: senderId, receiverNumber: receiver.number, message: aiText });
                const timestamp = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                updateAccountUI(senderId, { actionStatus: `✔ Sent to ${receiver.name}`, timestamp: `Last Sent: ${timestamp}` });
                pair.history.push({ sender: sender.name, message: aiText, receiver: receiver.name });
                pair.lastMessage = aiText;
                pair.unansweredMessages = 1;
                pair.nextSpeakerId = receiverId;
                pair.followUpLevel = 0;
                pair.conversationPausedBySleep = false;
                pair.isPaused = false;
                return;
            }
        }
        
        const currentStatus = getAccountStatus(sender);
        if (currentStatus === "Sleeping") {
            pair.nextSpeakerId = receiverId;
            return;
        }

        updateAccountUI(senderId, { actionStatus: '' });
        
        if (lastHistoryEntry && lastHistoryEntry.sender === receiver.name) {
            pair.unansweredMessages = 0;
            pair.followUpLevel = 0;
            pair.isPaused = false;
            pair.conversationPausedBySleep = false;
        }

        const receiverStatus = getAccountStatus(receiver);
        if (pair.unansweredMessages >= 1 && receiverStatus !== 'Online') {
            pair.followUpLevel++;
            let followupMessage = "";
            let followupDelay = 0;
            if (pair.followUpLevel >= 2 && receiverStatus === 'Sleeping') {
                followupMessage = "Oh, sepertinya kamu sudah tidur ya, yaudah selamat istirahat.";
                followupDelay = 5000;
                pair.conversationPausedBySleep = true;
            } else {
                switch (pair.followUpLevel) {
                    case 1: followupMessage = "P"; followupDelay = 10000 + Math.random() * 20000; break;
                    case 2: followupMessage = "Sorry, lagi sibuk bgt.."; followupDelay = 30000 + Math.random() * 30000; break;
                    default: followupMessage = "Kalau dah gak sibuk kabarin yo"; followupDelay = 5000; pair.isPaused = true; break;
                }
            }
            if (followupMessage) {
                updateAccountUI(senderId, { actionStatus: `Following up (Lvl ${pair.followUpLevel})...` });
                await new Promise(resolve => setTimeout(resolve, followupDelay));
                await window.electronAPI.sendMessage({ senderWindowId: senderId, receiverNumber: receiver.number, message: followupMessage });
                pair.history.push({ sender: sender.name, message: followupMessage, receiver: receiver.name });
                updateAccountUI(senderId, { chatPreview: `<div class="chat-bubble">${followupMessage}</div>` });
                if(pair.isPaused || pair.conversationPausedBySleep) updateAccountUI(senderId, { actionStatus: `⏸️ Paused` });
                return;
            }
        }
        
        const { delay, status: newStatus } = dynamicDelayFromMessage(pair.lastMessage, { delayMin: room.delayMin, delayMax: room.delayMax }, sender.job, pair.lastStatus, sender.name);
        pair.lastStatus = newStatus;
        await new Promise(resolve => setTimeout(resolve, delay));
        if (getAccountStatus(sender) === 'Sleeping') { pair.nextSpeakerId = receiverId; return; }

        const HESITATION_CHANCE = 0.15; 
        if (pair.history.length > 0 && Math.random() < HESITATION_CHANCE) {
            updateAccountUI(senderId, { actionStatus: 'Typing...' });
            await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 5000));
            updateAccountUI(senderId, { actionStatus: '' });
            pair.nextSpeakerId = receiverId;
            return; 
        }

        updateAccountUI(senderId, { actionStatus: 'Thinking...' });
        
        let messageToReply = pair.lastMessage;
        if (await isConversationStuck(pair.history) && !pair.recentlySwitchedTopic) {
            updateStatus(`Loop detected in room "${room.topic}". Injecting new subtopic...`, 'processing');
            messageToReply = await generateRelatedSubtopic(room.topic, pair.history, sender.name);
            pair.recentlySwitchedTopic = true;
            setTimeout(() => { pair.recentlySwitchedTopic = false; }, 900000);
        }
        
        let rules = [];
        if (room.chatStyle === 'casual') rules.push("Gunakan bahasa santai sehari-hari.");
        else rules.push("Gunakan bahasa formal dan baku, tanpa emoji sama sekali.");

        const prompt = generateDynamicPrompt(messageToReply, sender.name, receiver.name, pair.history, room.topic, sender.personality, room.chatStyle, rules, sender.job);
        let aiText = await window.electronAPI.askAI(prompt);
        aiText = formatMessage(aiText);
        if (!aiText) return;

        updateAccountUI(senderId, { actionStatus: 'Typing...' });
        const typingTimeMs = Math.max(1200, Math.min(aiText.length * (60 + Math.random() * 40), 5000));
        await new Promise(resolve => setTimeout(resolve, typingTimeMs));

        await window.electronAPI.sendMessage({ senderWindowId: senderId, receiverNumber: receiver.number, message: aiText });
        
        const timestamp = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        updateAccountUI(senderId, { actionStatus: `✔ Sent to ${receiver.name}`, chatPreview: `<div class="chat-bubble" title="Sent to ${receiver.name}">${aiText}</div>`, timestamp: `Last Sent: ${timestamp}`});
        updateAccountUI(receiverId, { actionStatus: `↩ Received from ${sender.name}`, chatPreview: `<div class="chat-bubble" style="background-color: var(--background);" title="Received from ${sender.name}">${aiText}</div>`, timestamp: `Last Received: ${timestamp}`});
        
        pair.lastMessage = aiText;
        pair.history.push({ sender: sender.name, message: aiText, receiver: receiver.name });
        pair.unansweredMessages = 1;
        pair.followUpLevel = 0;
        pair.nextSpeakerId = receiverId;

    } catch (err) {
        const minorErrors = ['Window is busy', 'ERR_ABORTED', 'Send button or main panel not found'];
        if (minorErrors.some(e => err.message.includes(e))) {
            console.warn(`Recoverable timing error on pair ${pair?.id}: ${err.message}`);
            updateAccountUI(pair?.nextSpeakerId, { actionStatus: `Retrying...` });
        } else {
            updateStatus(`Error on pair ${pair?.id}: ${err.message}`, 'error');
            updateAccountUI(pair?.nextSpeakerId, { actionStatus: `Error!` });
        }
    }
}

async function runGroupTurn(room, shuffledMembers) {
    try {
        const speakerIndex = room.nextGroupSpeakerIndex;
        const senderId = shuffledMembers[speakerIndex];
        const sender = state.accounts[senderId];
        if (!sender || !sender.job || !sender.name) {
            console.error(`[ERROR] Data akun tidak lengkap untuk ID: ${senderId}. Melewati giliran.`);
            return;
        }
        const currentStatus = getAccountStatus(sender);
        if (currentStatus === "Sleeping") return;
        updateAccountUI(senderId, { actionStatus: '' });
        const { delay } = dynamicDelayFromMessage('', { delayMin: room.delayMin, delayMax: room.delayMax }, sender.job, '', sender.name);
        await new Promise(resolve => setTimeout(resolve, delay));
        if (getAccountStatus(sender) === 'Sleeping') {
            console.log(`${sender.name} tertidur saat menunggu giliran. Aksi dibatalkan.`);
            return;
        }
        updateAccountUI(senderId, { actionStatus: 'Thinking...' });
        const groupContributionStyles = [
            `Ajukan sebuah pertanyaan terbuka yang relevan dengan topik utama ("${room.topic}") untuk memancing diskusi.`,
            `Bagikan sebuah pendapat atau pengalaman pribadi singkat yang berhubungan dengan salah satu pesan dalam riwayat obrolan.`,
            `Buat sebuah lelucon singkat atau komentar ringan yang masih nyambung dengan suasana obrolan.`,
            `Setuju dengan salah satu poin dari riwayat chat, dan tambahkan sedikit detail atau alasan versimu sendiri.`,
            `Abaikan sementara pesan terakhir, dan mulai sebuah sub-topik baru yang masih sedikit berhubungan dengan topik utama: "${room.topic}".`,
            `Berikan reaksi singkat (contoh: "Wah, serius?", "Wkwkwk", "Sama banget!", "Gila sih itu") terhadap salah satu pesan terakhir.`,
            `Coba kaitkan topik "${room.topic}" dengan sebuah berita atau tren yang sedang populer saat ini.`
        ];
        const chosenStyle = groupContributionStyles[Math.floor(Math.random() * groupContributionStyles.length)];
        const historyContext = (room.history || []).slice(-5).map(m => `${m.sender}: ${m.message}`).join('\n');
        
        // PERUBAHAN: Menambahkan aturan bahasa yang lebih tegas
        const prompt = `Anda adalah ${sender.name} (seorang ${sender.job}) dengan kepribadian: "${sender.personalityName}". Anda sedang berada di dalam sebuah grup chat WhatsApp. Topik utama grup ini adalah "${room.topic}".\n\nRiwayat 5 pesan terakhir:\n${historyContext || "(Belum ada pesan, Anda yang mulai)"}\n\n---\nTUGAS ANDA:\nBerkontribusilah ke dalam percakapan secara alami. Untuk giliran Anda kali ini, gunakan gaya berikut: "${chosenStyle}"\n\nATURAN PALING PENTING:\n1.  JANGAN PERNAH menyertakan nama Anda di awal pesan (contoh SALAH: Irfan: Halo).\n2.  JANGAN PERNAH membungkus jawaban Anda dengan tanda kutip (contoh SALAH: "Halo semua").\n3.  JAWABAN ANDA HARUS BERSIH, HANYA BERISI TEKS PESANNYA SAJA.\n4. ATURAN MUTLAK: Balasan Anda HARUS SELALU dalam Bahasa Indonesia. Jangan pernah menggunakan bahasa lain selain Indonesia.\n\nContoh output BENAR:\nWah, menarik banget topiknya!`;
        
        let aiText = await window.electronAPI.askAI(prompt);
        aiText = formatMessage(aiText);
        if (!aiText) {
            console.log(`AI untuk ${sender.name} memilih untuk tidak mengirim pesan kali ini.`);
            return;
        }
        updateAccountUI(senderId, { actionStatus: 'Typing...' });
        const typingTimeMs = Math.max(1200, Math.min(aiText.length * (60 + Math.random() * 40), 5000));
        await new Promise(resolve => setTimeout(resolve, typingTimeMs));
        await window.electronAPI.sendGroupMessage({ senderWindowId: senderId, groupName: room.groupName, message: aiText });
        const timestamp = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        updateAccountUI(senderId, { actionStatus: `✔ Sent to Group` });
        if(!room.history) room.history = [];
        room.history.push({ sender: sender.name, message: aiText });
        room.members.forEach(memberId => {
            const chatPreview = `<div class="chat-bubble" title="from ${sender.name}">${sender.name}: ${aiText}</div>`;
            const timestampText = `Last Activity: ${timestamp}`;
            updateAccountUI(memberId, { chatPreview, timestamp: timestampText });
        });
    } catch (err) {
        updateStatus(`Error in group chat: ${err.message}`, 'error');
    } finally {
        room.nextGroupSpeakerIndex = (room.nextGroupSpeakerIndex + 1) % shuffledMembers.length;
    }
}

async function runPostStoryTaskCycle(room, buttonEl) {
    updateStatus(`Menjalankan tugas Post Story untuk room: "${room.topic}"...`, 'processing');
    const shuffledMembers = [...room.members].sort(() => 0.5 - Math.random());

    for (const accountId of shuffledMembers) {
        if (!room.isAutomationRunning) break;
        const account = state.accounts[accountId];
        if (!account || getAccountStatus(account) === 'Sleeping') continue;

        try {
            updateAccountUI(accountId, { actionStatus: 'Creating a new story...' });

            // ======================================================================
            // PERBAIKAN FINAL: Menambahkan ID unik untuk memaksa hasil yang berbeda
            // ======================================================================
            const prompt = `Anda adalah seorang motivator berpengalaman.
Tugas Anda adalah menulis satu kutipan motivasi singkat (satu atau dua kalimat) untuk status WhatsApp.

Untuk status kali ini, buatlah kutipan yang mungkin akan ditulis oleh seorang ${account.job} dengan kepribadian "${account.personalityName}".

PENTING: Hasilnya HARUS selalu unik dan berbeda dari permintaan sebelumnya. Gunakan variasi kata dan ide.
ID Permintaan Unik (abaikan isinya, ini hanya untuk memastikan jawaban berbeda): ${Date.now()}

Langsung tulis kutipannya saja, tanpa awalan atau akhiran seperti tanda kutip.
ATURAN MUTLAK: Jawaban Anda HARUS SELALU dalam Bahasa Indonesia.`;
            
            const storyText = await window.electronAPI.askAI(prompt);

            if (storyText && !storyText.includes("Oops")) {
                const postResult = await window.electronAPI.postTextStory({ accountId, storyText });

                if (postResult.success) {
                    console.log(`${account.name} memposting story: "${storyText}"`);
                    updateAccountUI(accountId, { actionStatus: '✔ Story Posted' });
                } else {
                    throw new Error(postResult.reason || 'Failed to post story');
                }
            } else {
                 updateAccountUI(accountId, { actionStatus: 'AI failed to generate content' });
            }
        } catch (err) {
            updateStatus(`Error pada akun ${account.name}: ${err.message}`, 'error');
            updateAccountUI(accountId, { actionStatus: 'Error!' });
        }

        const delayBetweenAccounts = 5000 + Math.random() * 10000;
        await new Promise(resolve => setTimeout(resolve, delayBetweenAccounts));
    }

    updateStatus(`Tugas Post Story untuk room "${room.topic}" selesai.`, 'success');
    if (room.isAutomationRunning) {
        toggleAutomation(room.id, buttonEl);
    }
}

async function runStoryTaskCycle(room, buttonEl) {
    updateStatus(`Menjalankan tugas Story untuk room: "${room.topic}"...`, 'processing');
    const shuffledMembers = [...room.members].sort(() => 0.5 - Math.random());
    for (const accountId of shuffledMembers) {
        if (!room.isAutomationRunning) break; 
        const account = state.accounts[accountId];
        if (!account || getAccountStatus(account) === 'Sleeping') {
            console.log(`Melewati ${account?.name || accountId} karena tidur atau tidak valid.`);
            continue;
        }
        try {
            updateAccountUI(accountId, { actionStatus: 'Viewing & Replying Story...' });
            const result = await window.electronAPI.findAndReplyToFirstStory(accountId);
            if (result.success) {
                updateAccountUI(accountId, { actionStatus: `✔ Replied to ${result.repliedTo}'s story` });
            } else {
                updateAccountUI(accountId, { actionStatus: `No new stories to view` });
            }
        } catch (err) {
            updateStatus(`Error pada akun ${account.name}: ${err.message}`, 'error');
            updateAccountUI(accountId, { actionStatus: 'Error!' });
        }
        const delayBetweenAccounts = 10000 + Math.random() * 20000;
        await new Promise(resolve => setTimeout(resolve, delayBetweenAccounts));
    }
    updateStatus(`Tugas Story untuk room "${room.topic}" selesai.`, 'success');
    if (room.isAutomationRunning) {
        toggleAutomation(room.id, buttonEl);
    }
}

async function toggleAutomation(roomId, buttonEl, storyTask = null) {
    const room = state.topicRooms[roomId];
    if (!room) return;
    if (!storyTask) {
        if (room.roomType === 'Story' && !room.isAutomationRunning) {
            showStoryTaskModal(roomId, buttonEl);
            return;
        }
        room.isAutomationRunning = !room.isAutomationRunning;
    } else {
        room.isAutomationRunning = true;
    }
    const isStory = room.roomType === 'Story';
    const startText = isStory ? '▶ Start Story' : '▶ Start Chat';
    const stopText = isStory ? '⏹ Stop Story' : '⏹ Stop Chat';
    if (room.isAutomationRunning) {
        buttonEl.innerHTML = stopText;
        buttonEl.classList.add('automation-active');
        setRoomControlsState(roomId, true);
        
        if (room.roomType === '1on1') {
            updateStatus(`Starting 1-on-1 automation for room: "${room.topic}"...`, 'processing');
            if (room.members.length < 2) {
                updateStatus(`Not enough accounts to start 1-on-1 chat.`, 'error');
                return toggleAutomation(roomId, buttonEl);
            }
            createPairsInRoom(room);
            while (room.isAutomationRunning) {
                const turnPromises = room.pairs.map(pair => runSingleTurnForPair(pair, room));
                await Promise.all(turnPromises);
                if (room.isAutomationRunning) await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } else if (room.roomType === 'group') {
            updateStatus(`Starting group automation for room: "${room.topic}"...`, 'processing');
            if (room.members.length < 1) {
                updateStatus(`Not enough accounts to start group chat.`, 'error');
                return toggleAutomation(roomId, buttonEl);
            }
            const shuffledMembers = [...room.members].sort(() => 0.5 - Math.random());
            room.nextGroupSpeakerIndex = 0;
            room.history = [];
            while (room.isAutomationRunning) {
                await runGroupTurn(room, shuffledMembers);
                if (room.isAutomationRunning) await new Promise(resolve => setTimeout(resolve, 1000));
            }
        } else if (room.roomType === 'Story') {
            if (room.members.length < 1) {
                updateStatus(`Not enough accounts to start Story task.`, 'error');
                return toggleAutomation(roomId, buttonEl);
            }
            if (storyTask === 'post_story') {
                runPostStoryTaskCycle(room, buttonEl);
            } else if (storyTask === 'view_reply') {
                runStoryTaskCycle(room, buttonEl);
            }
        }
    } else {
        buttonEl.innerHTML = startText;
        buttonEl.classList.remove('automation-active');
        updateStatus(`Automation stopped for room: "${room.topic}"`, 'info');
        setRoomControlsState(roomId, false);
        room.members.forEach(accountId => {
            updateAccountUI(accountId, { actionStatus: '' });
            updatePersistentStatusUI(accountId);
        });
    }
}

// =================================================================
//                      MANAJEMEN UI & EVENT
// =================================================================

function setRoomControlsState(roomId, isDisabled) {
    const roomContainer = document.querySelector(`.room-container[data-room-id="${roomId}"]`);
    if (!roomContainer) return;
    roomContainer.querySelector('.add-account-btn').disabled = isDisabled;
    roomContainer.querySelector('.delete-room-btn').disabled = isDisabled;
    const room = state.topicRooms[roomId];
    if (room) {
        room.members.forEach(accountId => {
            const card = roomContainer.querySelector(`.window-card[data-window-id="${accountId}"]`);
            if (card) {
                const closeBtn = card.querySelector(`[data-close="${accountId}"]`);
                if (closeBtn) closeBtn.disabled = isDisabled;
            }
        });
    }
}

function createRoom(topic, roomId, roomSettings) {
  const roomEl = roomContainerTemplate.content.cloneNode(true);
  const roomContainer = roomEl.querySelector('.room-container');
  roomContainer.dataset.roomId = roomId;
  roomContainer.dataset.roomType = roomSettings.roomType;
  state.topicRooms[roomId].id = roomId;

  const roomIconEl = roomContainer.querySelector('.room-icon');
  const roomTypeIcons = { '1on1': '👤', 'group': '👥', 'Story': '📸' };
  roomIconEl.textContent = roomTypeIcons[roomSettings.roomType] || '📂';

  roomContainer.querySelector('.room-topic-text').textContent = topic;
  const roomTypeText = roomContainer.querySelector('.room-type-text');
  roomTypeText.textContent = roomSettings.roomType;
  roomTypeText.className = `room-type-text type-${roomSettings.roomType}`;

  const groupNameText = roomContainer.querySelector('.group-name-text');
  if (roomSettings.roomType === 'group' && roomSettings.groupName) {
      groupNameText.textContent = roomSettings.groupName;
  }
  
  roomContainer.querySelector('.room-style-text').textContent = `Style: ${roomSettings.chatStyle}`;
  roomContainer.querySelector('.room-delay-text').textContent = `Delay: ${roomSettings.delayMin/1000}-${roomSettings.delayMax/1000}s`;

  // --- TAMBAHKAN EVENT LISTENER UNTUK TOMBOL EDIT ---
  const editBtn = roomContainer.querySelector('.edit-room-btn');
  editBtn.addEventListener('click', () => showEditRoomModal(roomId));
  // --- AKHIR PENAMBAHAN ---

  const addAccountBtn = roomContainer.querySelector('.add-account-btn');
  const accountsWrapper = roomContainer.querySelector('.room-accounts');
  addAccountBtn.addEventListener('click', () => showAccountModal(roomId, accountsWrapper));
  
  const automationBtn = roomContainer.querySelector('.automation-btn');
  if (roomSettings.roomType === 'Story') {
    automationBtn.innerHTML = '▶ Start Story';
  } else {
    automationBtn.innerHTML = '▶ Start Chat';
  }
  automationBtn.addEventListener('click', () => toggleAutomation(roomId, automationBtn));
  
  const deleteRoomBtn = roomContainer.querySelector('.delete-room-btn');
  deleteRoomBtn.addEventListener('click', () => {
    if (confirm(`Delete room "${topic}" and all its accounts?`)) {
      (state.topicRooms[roomId]?.members || []).forEach(windowId => window.electronAPI.closeWindow(windowId));
      delete state.topicRooms[roomId];
      roomContainer.remove();
      updateStatus(`Room "${topic}" deleted.`, 'info');
    }
  });
  windowsContainer.appendChild(roomContainer);
}

// renderer.js

function showEditRoomModal(roomId) {
    const roomSettings = state.topicRooms[roomId];
    if (!roomSettings) return;

    const modal = roomModalTemplate.content.cloneNode(true);
    const modalElement = modal.firstElementChild;
    document.body.appendChild(modalElement);

    modalElement.querySelector('h3').textContent = 'Edit Room';
    const confirmBtn = modalElement.querySelector('#confirmRoomBtn');
    confirmBtn.textContent = 'Update';

    // Ambil semua elemen penting dari modal
    const roomTypeRadios = modalElement.querySelectorAll('input[name="roomType"]');
    const topicInput = modalElement.querySelector('#roomTopicInput');
    const topicLabel = modalElement.querySelector('label[for="roomTopicInput"]');
    const groupNameContainer = modalElement.querySelector('#groupNameContainer');
    const chatOptionsContainer = modalElement.querySelector('#chatOptionsContainer');
    
    // ======================================================================
    // PERBAIKAN: Event listener yang lebih cerdas untuk menangani semua kasus
    // ======================================================================
    roomTypeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            const selectedType = e.target.value;
            
            if (selectedType === 'Story') {
                topicLabel.textContent = 'Task / Story Theme:';
                groupNameContainer.style.display = 'none';
                chatOptionsContainer.style.display = 'none';
            } else {
                topicLabel.textContent = 'Conversation Topic:';
                chatOptionsContainer.style.display = 'block';
                if (selectedType === 'group') {
                    groupNameContainer.style.display = 'block';
                } else { // 1on1
                    groupNameContainer.style.display = 'none';
                }
            }
        });
    });
    // ======================================================================

    // Isi form dengan data yang sudah ada dan picu event change
    roomTypeRadios.forEach(radio => {
        radio.checked = radio.value === roomSettings.roomType;
        if (radio.checked) {
            radio.dispatchEvent(new Event('change'));
        }
    });
    
    topicInput.value = roomSettings.topic;
    if (roomSettings.roomType === 'group') {
        modalElement.querySelector('#groupNameInput').value = roomSettings.groupName;
    }
    modalElement.querySelectorAll('input[name="chatStyle"]').forEach(radio => radio.checked = radio.value === roomSettings.chatStyle);
    modalElement.querySelector('#delayMinInput').value = roomSettings.delayMin;
    modalElement.querySelector('#delayMaxInput').value = roomSettings.delayMax;
    
    const closeModal = () => document.body.removeChild(modalElement);
    modalElement.querySelector('#cancelRoomBtn').addEventListener('click', closeModal);

    confirmBtn.addEventListener('click', () => {
        const newRoomType = modalElement.querySelector('input[name="roomType"]:checked').value;
        let newTopic, newGroupName = null, newChatStyle, newDelayMin, newDelayMax;
        
        if (newRoomType === 'Story') {
            newTopic = 'Story Task'; // Topik untuk Story Room bersifat tetap
            newChatStyle = 'casual';
            newDelayMin = 5000;
            newDelayMax = 10000;
        } else {
            newTopic = topicInput.value.trim();
            if (!newTopic) return alert('Topic is required.');
            if (newRoomType === 'group') {
                newGroupName = modalElement.querySelector('#groupNameInput').value.trim();
                if (!newGroupName) return alert('Group Name is required.');
            }
            newChatStyle = modalElement.querySelector('input[name="chatStyle"]:checked').value;
            newDelayMin = parseInt(modalElement.querySelector('#delayMinInput').value, 10);
            newDelayMax = parseInt(modalElement.querySelector('#delayMaxInput').value, 10);
        }
        
        state.topicRooms[roomId] = {
            ...state.topicRooms[roomId],
            roomType: newRoomType,
            topic: newTopic,
            groupName: newGroupName,
            chatStyle: newChatStyle,
            delayMin: newDelayMin,
            delayMax: newDelayMax,
        };
        
        updateRoomCardUI(roomId);
        updateStatus(`Room "${newTopic}" updated.`, 'success');
        closeModal();
    });
}

function updateRoomCardUI(roomId) {
    const roomContainer = document.querySelector(`.room-container[data-room-id="${roomId}"]`);
    if (!roomContainer) return;

    const roomSettings = state.topicRooms[roomId];
    
    roomContainer.dataset.roomType = roomSettings.roomType;
    
    const roomIconEl = roomContainer.querySelector('.room-icon');
    const roomTypeIcons = { '1on1': '👤', 'group': '👥', 'Story': '📸' };
    roomIconEl.textContent = roomTypeIcons[roomSettings.roomType] || '📂';

    roomContainer.querySelector('.room-topic-text').textContent = roomSettings.topic;
    
    const roomTypeText = roomContainer.querySelector('.room-type-text');
    roomTypeText.textContent = roomSettings.roomType;
    roomTypeText.className = `room-type-text type-${roomSettings.roomType}`;

    const groupNameText = roomContainer.querySelector('.group-name-text');
    if (roomSettings.roomType === 'group' && roomSettings.groupName) {
        groupNameText.textContent = roomSettings.groupName;
    }

    roomContainer.querySelector('.room-style-text').textContent = `Style: ${roomSettings.chatStyle}`;
    roomContainer.querySelector('.room-delay-text').textContent = `Delay: ${roomSettings.delayMin/1000}-${roomSettings.delayMax/1000}s`;

    const automationBtn = roomContainer.querySelector('.automation-btn');
    automationBtn.innerHTML = roomSettings.roomType === 'Story' ? '▶ Start Story' : '▶ Start Chat';
}

function showAccountModal(roomId, containerEl) {
  const modal = nameModalTemplate.content.cloneNode(true);
  const modalElement = modal.firstElementChild;
  document.body.appendChild(modalElement);
  const inputField = modalElement.querySelector('#accountNameInput');
  const numberField = modalElement.querySelector('#accountNumberInput');
  const cancelBtn = modalElement.querySelector('#cancelBtn');
  const confirmBtn = modalElement.querySelector('#confirmBtn');
  inputField.focus();
  const closeModal = () => document.body.removeChild(modalElement);
  cancelBtn.addEventListener('click', closeModal);
  confirmBtn.addEventListener('click', async () => {
    const accountName = inputField.value.trim();
    const accountNumber = numberField.value.trim();
    if (!accountName || !accountNumber.match(/^[+]?[0-9]{7,20}$/)) {
      return alert('Valid account name and phone number are required.');
    }
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Processing...';
    try {
      const result = await window.electronAPI.getOrCreateAccount({ name: accountName, number: accountNumber });
      if (result && !state.accounts[result.windowId]) {
        const jobs = Object.keys(jobSchedules);
        const assignedJob = jobs[Math.floor(Math.random() * jobs.length)];
        const personalityKeys = Object.keys(personalityModels);
        const assignedPersonalityName = personalityKeys[Math.floor(Math.random() * personalityKeys.length)];
        state.accounts[result.windowId] = { 
          name: result.name, number: result.number, roomId, 
          personality: personalityModels[assignedPersonalityName],
          personalityName: assignedPersonalityName,
          job: assignedJob 
        };
        state.topicRooms[roomId].members.push(result.windowId);
        addWindowCard(containerEl, result.windowId, result.name, result.number, assignedJob, assignedPersonalityName);
        updateStatus(`Account "${result.name}" ${result.status}.`, 'success');
      } else {
          updateStatus(`Account "${accountName}" is already open or failed.`, 'info');
      }
    } catch (err) {
      updateStatus(`Error: ${err.message}`, 'error');
    } finally {
      closeModal();
    }
  });
}

function addWindowCard(container, windowId, windowName, accountNumber, job, personalityName) {
  const card = document.createElement('div');
  card.className = 'window-card';
  card.dataset.windowId = windowId;
  
  card.innerHTML = `
    <div class="card-actions">
      <button data-focus="${windowId}" title="Focus">🔍</button>
      <button data-close="${windowId}" title="Close & Clear Session">✕</button>
    </div>
    <div class="account-name">${windowName}</div>
    <div class="window-content">
      <div class="account-details">
        <div><strong>No HP:</strong> ${accountNumber}</div>
        <div><strong>Karakter:</strong> ${personalityName}</div>
        <div><strong>Profesi:</strong> ${job}</div>
      </div>
      <div class="card-footer">
        <div class="automation-status-container">
            <span class="persistent-status" id="status-${windowId}">${statusDisplays.Ready.emoji} Ready</span>
            <span class="action-status" id="action-status-${windowId}"></span>
        </div>
        <div class="timestamp-status" id="timestamp-${windowId}"></div>
        <div class="chat-preview" id="chat-${windowId}"></div>
      </div>
    </div>
  `;
  container.appendChild(card);

  card.querySelector(`[data-focus]`).addEventListener('click', () => window.electronAPI.focusWindow(windowId));
  card.querySelector(`[data-close]`).addEventListener('click', () => {
      if (confirm(`Tutup akun ${windowName} dan hapus sesinya?`)) {
          window.electronAPI.closeWindow(windowId);
      }
  });
}

function showStoryTaskModal(roomId, buttonEl) {
    const modalTemplate = document.getElementById('storyTaskModalTemplate');
    const modal = modalTemplate.content.cloneNode(true);
    const modalElement = modal.firstElementChild;
    document.body.appendChild(modalElement);

    const closeModal = () => document.body.removeChild(modalElement);

    modalElement.querySelector('#startPostStoryBtn').addEventListener('click', () => {
        closeModal();
        toggleAutomation(roomId, buttonEl, 'post_story');
    });
    modalElement.querySelector('#startViewReplyBtn').addEventListener('click', () => {
        closeModal();
        toggleAutomation(roomId, buttonEl, 'view_reply');
    });
    modalElement.querySelector('#cancelStoryTaskBtn').addEventListener('click', closeModal);
}

function showRoomModal() {
  const modal = roomModalTemplate.content.cloneNode(true);
  const modalElement = modal.firstElementChild;
  document.body.appendChild(modalElement);
  
  const topicInput = modalElement.querySelector('#roomTopicInput');
  const roomOptionsContainer = modalElement.querySelector('#roomOptionsContainer');
  const closeModal = () => document.body.removeChild(modalElement);

  modalElement.querySelectorAll('input[name="roomType"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
          const isStoryMode = e.target.value === 'Story';
          roomOptionsContainer.style.display = isStoryMode ? 'none' : 'block';
          if (!isStoryMode) {
              const isGroupMode = e.target.value === 'group';
              modalElement.querySelector('#groupNameContainer').style.display = isGroupMode ? 'block' : 'none';
          }
      });
  });

  modalElement.querySelector('#cancelRoomBtn').addEventListener('click', closeModal);
  modalElement.querySelector('#confirmRoomBtn').addEventListener('click', () => {
    const roomType = modalElement.querySelector('input[name="roomType"]:checked').value;
    let topic, groupName = null, chatStyle, delayMin, delayMax;

    if (roomType === 'Story') {
        topic = 'Story Task';
        chatStyle = 'casual';
        delayMin = 5000;
        delayMax = 10000;
    } else {
        topic = modalElement.querySelector('#roomTopicInput').value.trim();
        if (!topic) return alert('Room topic is required for this room type.');
        if (roomType === 'group') {
            groupName = modalElement.querySelector('#groupNameInput').value.trim();
            if (!groupName) return alert('Group Name is required for Group room type.');
        }
        chatStyle = modalElement.querySelector('input[name="chatStyle"]:checked').value;
        if (chatStyle === 'random') chatStyle = Math.random() < 0.5 ? 'casual' : 'formal';
        delayMin = parseInt(modalElement.querySelector('#delayMinInput').value, 10);
        delayMax = parseInt(modalElement.querySelector('#delayMaxInput').value, 10);
    }
    
    const roomId = `room-${Date.now()}`;
    const roomSettings = {
      id: roomId, topic, members: [], pairs: [], groupName,
      isAutomationRunning: false, roomType, chatStyle,
      delayMin, delayMax
    };
    state.topicRooms[roomId] = roomSettings;
    createRoom(topic, roomId, roomSettings);
    updateStatus(`Created room: "${topic}"`, 'success');
    closeModal();
  });
  topicInput.focus();
}

function initDarkMode() {
  const toggleBtn = document.getElementById('darkModeToggle');
  const applyMode = (isDark) => {
      document.body.classList.toggle('dark-mode', isDark);
      toggleBtn.textContent = isDark ? '☀️' : '🌙';
      localStorage.setItem('darkMode', isDark ? 'enabled' : 'disabled');
  };
  toggleBtn.addEventListener('click', () => applyMode(!document.body.classList.contains('dark-mode')));
  applyMode(localStorage.getItem('darkMode') === 'enabled');
}

// =================================================================
//                          INISIALISASI
// =================================================================

function initialize() {
    initDarkMode();
    document.getElementById('newRoomBtn').addEventListener('click', showRoomModal);
    document.getElementById('clearCacheBtn').addEventListener('click', () => {
        if (confirm('PERINGATAN!\nAksi ini akan menghapus SEMUA sesi login dan data. Aplikasi akan restart.\nLanjutkan?')) {
            updateStatus('Menghapus semua data dan restart...', 'processing');
            window.electronAPI.clearAllData();
        }
    });

    window.electronAPI.onWindowClosed((windowId) => {
        const account = state.accounts[windowId];
        if (account) {
            const card = document.querySelector(`.window-card[data-window-id="${windowId}"]`);
            if (card) card.remove();
            
            const room = state.topicRooms[account.roomId];
            if (room?.members) {
                room.members = room.members.filter(id => id !== windowId);
            }
            delete state.accounts[windowId];
            updateStatus(`Akun "${account.name}" ditutup.`, 'info');
        }
    });

    state.statusUpdateInterval = setInterval(updateAllAccountStatuses, 5000);
    updateStatus('Ready to manage WhatsApp accounts.');
}

initialize();
