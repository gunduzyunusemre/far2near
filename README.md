# 🚀 far2near — P2P Mesajlaşma & Sesli Görüşme Platformu

Discord benzeri, sunucusuz (serverless felsefesi) mimariye sahip, P2P tabanlı gerçek zamanlı mesajlaşma, sesli/görüntülü görüşme ve ekran paylaşımı uygulaması.

---

## 🌟 Öne Çıkan Özellikler

### 1. 🏠 Oda Sistemi (Sunucusuz & P2P Koordinasyon)
- **Hızlı Oda Kurma:** Tek tıkla benzersiz 6 haneli alfanümerik oda kodu (örn. `A3B9K2`) ve davet bağlantısı üretimi.
- **Kurucu / Sahip Rolü:** Odayı kuran kişi otomatik olarak `👑 Oda Sahibi` olur ve tam yetkiye sahip olur.
- **Kapalı Oda Modu (Onaylı Katılım):** Oda sahibi isterse odayı kapalı yapabilir; yeni katılanlar için gerçek zamanlı onay bildirimi düşer.
- **Oda Ayarları:** İsim, açıklama, maksimum katılımcı sayısı (2-50), kilit ve güvenlik yapılandırmaları.

### 2. 💬 Gerçek Zamanlı Mesajlaşma & Zengin İçerik
- **Metin & Medya:** Güvenli Markdown formatlama, URL önizlemeleri, 25MB'a kadar dosya/resim paylaşımı.
- **Etkileşim:** Canlı "Yazıyor..." göstergeleri, tek tıkla emoji reaksiyonları (👍, ❤️, 🔥, 😂, 🚀, 🎉), mesaj alıntılama/yanıt (thread), mesaj düzenleme ve silme.
- **3 Sütunlu Discord Düzeni:** Sol kanal/ses menüsü + Orta mesaj akışı & sahne + Sağ katılımcı ve yetki listesi.

### 3. 🎙️ WebRTC P2P Sesli Görüşme & Ekran Paylaşımı
- **P2P Mesh Mimarisi:** Medya trafiği (ses, kamera, ekran) sunucudan geçmez; doğrudan tarayıcılar arasında `RTCPeerConnection` üzerinden şifreli akar.
- **Sesli Kanallar:** Birden fazla sesli kanal (Sesli Kanal 1, Sesli Kanal 2 vb.).
- **Konuşma Tespiti (VAD):** Web Audio API ile mikrofon ses şiddeti gerçek zamanlı ölçülür; konuşan kişinin avatarı etrafında **yeşil parlama** efekti gösterilir.
- **Ekran Paylaşımı & Kamera:** Tiyatro modunda tam ekran paylaşımı ve katılımcı video ızgarası.
- **El Kaldırma:** `✋ Söz İste / El Kaldır` animasyonlu bildirimleri.

### 4. 🛡️ Güvenlik & Moderasyon
- **JWT Tabanlı Oda Oturumu:** Her kullanıcı için odaya ve role özel imzalanmış kısa ömürlü token.
- **Roller ve İzin Matrisi:** 👑 Oda Sahibi, 🛡️ Yönetici (Admin), ⚔️ Moderatör, 👤 Üye, 🔇 Susturulmuş (Muted).
- **Moderasyon Araçları:** Kullanıcı susturma, odadan atma (kick), kalıcı yasaklama (ban).
- **Denetim Günlüğü (Audit Log):** Katılma, ayrılma, rol değişiklikleri ve silinen mesajların zaman damgalı kaydı.
- **XSS & Güvenlik:** DOMPurify ile temizlenmiş Markdown, Helmet.js güvenlik başlıkları, Zod şema doğrulaması ve Rate Limiting.

---

## 🏗️ Mimari & Teknoloji Yığını

| Katman | Teknolojiler |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Zustand, Lucide Icons |
| **Realtime & P2P** | WebRTC (RTCPeerConnection, Web Audio API), Socket.io Client |
| **Backend (Signaling)** | Node.js, Express, Socket.io, JSONWebToken, Zod, Helmet, Express-Rate-Limit |
| **Monorepo** | NPM Workspaces (`packages/shared-types`, `apps/server`, `apps/web`) |

---

## 🚀 Kurulum ve Çalıştırma

### Gereksinimler
- Node.js (v18+)
- npm (v9+)

### Adımlar

```bash
cd far2near
npm.cmd run dev
ssh -o StrictHostKeyChecking=no -R 80:127.0.0.1:4000 nokey@localhost.run #Farklı bir terminalden bunu çalıştır
```
xxxxxx.lhr.life tunneled with tls termination, https://xxxxxx.lhr.life tipindeki satırdan linki kopyalayıp başlayabilirsiniz.

---

## 📄 Lisans
Bu proje [MIT](LICENSE) lisansı ile lisanslanmıştır.
