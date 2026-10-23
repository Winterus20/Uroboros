# AI & DEVELOPER SECOND BRAIN (İKİNCİ BEYİN)
## `Hold That Number` Geliştirme Yönetim Merkezi

Bu klasör, **`Hold That Number`** projesinin yaşayan hafıza bankasıdır (Living Memory Bank). Araştırmalar,
mimari kararlar (ADR), aktif görevler ve yol haritası burada tek bir standart altında tutulur.

> **Kimlik notu:** Proje 2026-10-23'te "Kozmik Oburluk / UROBOROS" temasından **`Hold That Number`**'a
> pivot etti. Eski temanın içerik dokümanları ve ölçüm artefaktları silindi (git geçmişinde duruyor);
> ADR'ler silinmedi — ADR karar kaydıdır, içerik değil.

---

## 📁 Dizin Mimarisi

```
brain/
├── README.md               # Bu kılavuz ve klasör haritası
│
├── context/                # Projenin değişmez ve yaşayan bağlamı
│   ├── project-brief.md    # Vizyon, oyun felsefesi, hedef
│   ├── narrative-voice.md  # Ses sözleşmesi (sessiz meta, gerçek "sen", tek ses çift ritim)
│   ├── visual-language.md  # Görsel dil sözleşmesi (A1 kapanınca yeniden yazılacak)
│   ├── system-patterns.md  # Mimari desenler, döngüler, bileşen yapısı
│   └── tech-context.md     # Kütüphaneler, sürümler, kısıtlar
│
├── tasks/                  # Görev ve ilerleme yönetimi
│   ├── todo.md             # Backlog (1. basamak dikey dilimi + açık maddeler)
│   ├── in-progress.md      # Aktif iş: 1. basamak dikey dilimi
│   └── completed.md        # Tarihçe (eski tema dönemi dahil, silinmedi)
│
├── decisions/              # ADR'ler — 0077 pivot kararı dahil, hiçbiri silinmez
│
└── research/               # Yaşayan araştırma
    ├── theme-pivot-grilling-2026-10-23.md      # TEK GERÇEK: 38 karar, 1. basamak spec'i
    ├── number-ladder-script-2026-10.md         # 11 basamak senaryosu (SEN: satırları devredilecek)
    ├── theme-pivot-open-questions-2026-10.md   # Açık sorular
    ├── incremental-genre-synthesis.md          # Janra sentezi
    ├── antimatter-dimensions-pacing-mechanics.md
    └── idle-game-math-and-scaling.md
```

---

## 📌 Çalışma Kuralları

1. **Her yeni işte:** önce `tasks/todo.md` → `in-progress.md`, bitince `completed.md`.
2. **Kritik mimari kararlarda:** `decisions/` altına ADR.
3. **Yeni araştırmalarda:** `research/` altına; eskimiş araştırma **silinir**, arşivlenmez.
4. **Hafıza teyidi:** yeni oturumda önce `research/theme-pivot-grilling-2026-10-23.md` §6 (devam noktası).
