import { describe, expect, it } from "vitest";

import { Decimal } from "../core/math";
import { buildUnlockContext, FEATURE_UNLOCKS, getFeatureById } from "../game/unlocks";
import { getBranchGate } from "../game/branches";
import {
  NAV_FEATURE_IDS,
  branchAchievementHint,
  navSilhouetteMeter,
  navSilhouetteState,
  navSilhouetteStepFlags,
  nextUnlockLabelFor,
  TAB_ORDER
} from "./useNavigation";
import type { UnlockContext } from "../game/unlocks";

/**
 * P3.2 — nav siluet durumu + "Sıradaki Açılacak" bandı ipucu testleri
 * (saf fonksiyonlar; bileşen mount edilmez).
 *
 * Bağlam `buildUnlockContext` ile kurulur — store'a gerek yoktur.
 */

interface ContextOptions {
  matter?: string;
  lifetimePeakMatter?: string;
  achievements?: readonly string[];
  singularities?: number;
}

function makeContext(options: ContextOptions = {}): UnlockContext {
  return buildUnlockContext({
    matter: new Decimal(options.matter ?? "0"),
    lifetimePeakMatter: new Decimal(options.lifetimePeakMatter ?? options.matter ?? "0"),
    dimensions: [],
    dimensionShifts: 0,
    galaxies: 0,
    singularities: options.singularities ?? 0,
    achievements: options.achievements ?? []
  });
}

/** Omurga sekmeleri: dekad eşiği tek başına açar, dal kapısı yoktur. */
const SPINE_TABS = ["autobuyers", "lab", "challenges"] as const;

describe("NAV_FEATURE_IDS", () => {
  it("her TabId için tanımlı", () => {
    for (const tab of TAB_ORDER) {
      expect(Object.prototype.hasOwnProperty.call(NAV_FEATURE_IDS, tab)).toBe(true);
    }
    expect(Object.keys(NAV_FEATURE_IDS).sort()).toEqual([...TAB_ORDER].sort());
  });

  it("özellik kapısı olan sekmelerin id'leri FEATURE_UNLOCKS içinde GERÇEK", () => {
    for (const tab of TAB_ORDER) {
      const featureId = NAV_FEATURE_IDS[tab];
      if (featureId === null) continue;
      expect(getFeatureById(featureId)).not.toBeNull();
      expect(FEATURE_UNLOCKS.some((f) => f.id === featureId)).toBe(true);
    }
  });

  it("kapısı olmayan sekmeler null (dimensions/achievements/stats)", () => {
    expect(NAV_FEATURE_IDS.dimensions).toBeNull();
    expect(NAV_FEATURE_IDS.achievements).toBeNull();
    expect(NAV_FEATURE_IDS.stats).toBeNull();
  });

  it("getter'lardan türetilen id'ler doğru özellikleri gösterir", () => {
    // labUnlocked → isFeatureUnlocked("lab"); crisisUnlocked → "crisis"; ...
    expect(NAV_FEATURE_IDS.lab).toBe("lab");
    expect(NAV_FEATURE_IDS.crisis).toBe("crisis");
    expect(NAV_FEATURE_IDS.autobuyers).toBe("autobuyers");
    expect(NAV_FEATURE_IDS.colony).toBe("colony");
    expect(NAV_FEATURE_IDS.challenges).toBe("challenges");
    // singularityUnlocked doğrudan eşik okur (1e30 / 1 tekillik):
    // FEATURE_UNLOCKS'ta karşılığı yok → özellik kapısı yok → null.
    expect(NAV_FEATURE_IDS.singularity).toBeNull();
  });

  it("dal kapısı olan sekmeler gerçekten BRANCH_GATES içinde", () => {
    expect(getBranchGate(NAV_FEATURE_IDS.crisis as string)).not.toBeNull();
    expect(getBranchGate(NAV_FEATURE_IDS.colony as string)).not.toBeNull();
    // Omurga sekmelerinde dal kapısı olmamalı (ADR-0073 §2.2).
    for (const tab of SPINE_TABS) {
      expect(getBranchGate(NAV_FEATURE_IDS[tab] as string)).toBeNull();
    }
  });
});

describe("navSilhouetteState", () => {
  it("null özellik kapısı → open", () => {
    const ctx = makeContext();
    for (const tab of TAB_ORDER) {
      if (NAV_FEATURE_IDS[tab] !== null) continue;
      expect(navSilhouetteState(null, ctx)).toBe("open");
    }
  });

  it("omurga sekmeleri (autobuyers/lab/challenges) HİÇBİR bağlamda siluet değil", () => {
    const contexts: UnlockContext[] = [
      makeContext(),
      makeContext({ matter: "1e28" }),
      makeContext({ matter: "1e310" }),
      makeContext({ matter: "1e310", achievements: ["cri_first", "cri_10"] })
    ];
    for (const tab of SPINE_TABS) {
      for (const ctx of contexts) {
        expect(navSilhouetteState(NAV_FEATURE_IDS[tab], ctx)).not.toBe("silhouette");
      }
    }
  });

  it("omurga sekmeleri boş bağlamda hidden, kendi eşiğinde open", () => {
    // challenges'ın kapısı kütle değil 1 tekilliktir; her sekme kendi eşiğinde.
    const openContexts: Record<(typeof SPINE_TABS)[number], UnlockContext> = {
      autobuyers: makeContext({ matter: "1e12" }),
      lab: makeContext({ matter: "1e70" }),
      challenges: makeContext({ matter: "1e310", singularities: 1 })
    };
    for (const tab of SPINE_TABS) {
      expect(navSilhouetteState(NAV_FEATURE_IDS[tab], makeContext())).toBe("hidden");
      expect(navSilhouetteState(NAV_FEATURE_IDS[tab], openContexts[tab])).toBe("open");
    }
  });

  it("crisis: dekad öncesi hidden, dekad sonrası başarım eksikse silhouette", () => {
    const before = makeContext({ matter: "1e27" });
    expect(navSilhouetteState(NAV_FEATURE_IDS.crisis, before)).toBe("hidden");

    const afterDecade = makeContext({ matter: "1e28", achievements: [] });
    expect(navSilhouetteState(NAV_FEATURE_IDS.crisis, afterDecade)).toBe("silhouette");
  });

  it("crisis: güvenli başarımlar tamamlanınca open", () => {
    const ctx = makeContext({ matter: "1e28", achievements: ["cri_first", "cri_10"] });
    expect(navSilhouetteState(NAV_FEATURE_IDS.crisis, ctx)).toBe("open");
  });

  it("colony: aynı akış (automation ailesi)", () => {
    expect(navSilhouetteState(NAV_FEATURE_IDS.colony, makeContext({ matter: "1e65" }))).toBe("hidden");
    expect(navSilhouetteState(NAV_FEATURE_IDS.colony, makeContext({ matter: "1e66", achievements: [] }))).toBe("silhouette");
    expect(
      navSilhouetteState(NAV_FEATURE_IDS.colony, makeContext({ matter: "1e66", achievements: ["auto_first", "auto_bulk"] }))
    ).toBe("open");
  });

  it("bilinmeyen özellik id'si → hidden (görünmez, düğme basılmaz)", () => {
    expect(navSilhouetteState("boyle_bir_ozellik_yok", makeContext({ matter: "1e310" }))).toBe("hidden");
  });

  it("ADR-0035 monotonluğu: dal açıldıktan sonra matter 0 olsa bile open kalır", () => {
    const opened = makeContext({
      matter: "0",
      lifetimePeakMatter: "1e28",
      achievements: ["cri_first", "cri_10"]
    });
    expect(navSilhouetteState(NAV_FEATURE_IDS.crisis, opened)).toBe("open");

    // Kapı kapalıyken de dekad eşiği monoton: tepe nokta korunur → görünür.
    const stillLocked = makeContext({ matter: "0", lifetimePeakMatter: "1e28", achievements: [] });
    expect(navSilhouetteState(NAV_FEATURE_IDS.crisis, stillLocked)).toBe("silhouette");
  });
});

describe("navSilhouetteMeter", () => {
  it("yalnızca siluet durumunda dolu", () => {
    const hidden = makeContext({ matter: "1e27" });
    const silhouette = makeContext({ matter: "1e28", achievements: [] });
    const open = makeContext({ matter: "1e28", achievements: ["cri_first", "cri_10"] });

    expect(navSilhouetteMeter(NAV_FEATURE_IDS.crisis, hidden)).toBeNull();
    expect(navSilhouetteMeter(NAV_FEATURE_IDS.crisis, silhouette)).toEqual({ current: 0, target: 2 });
    expect(navSilhouetteMeter(NAV_FEATURE_IDS.crisis, open)).toBeNull();
    expect(navSilhouetteMeter(null, silhouette)).toBeNull();
  });

  it("crisis meter: 0/2 boşta, 1/2 yarı, 2/2 dolu", () => {
    expect(navSilhouetteMeter(NAV_FEATURE_IDS.crisis, makeContext({ matter: "1e28" }))).toEqual({ current: 0, target: 2 });
    expect(
      navSilhouetteMeter(NAV_FEATURE_IDS.crisis, makeContext({ matter: "1e28", achievements: ["cri_first"] }))
    ).toEqual({ current: 1, target: 2 });
  });

  it("colony meter: automation ailesi 0/2", () => {
    expect(navSilhouetteMeter(NAV_FEATURE_IDS.colony, makeContext({ matter: "1e66" }))).toEqual({ current: 0, target: 2 });
  });
});

describe("navSilhouetteStepFlags", () => {
  it("siluet değilken boş dizi", () => {
    expect(navSilhouetteStepFlags(NAV_FEATURE_IDS.crisis, makeContext({ matter: "1e27" }))).toEqual([]);
    expect(navSilhouetteStepFlags(null, makeContext({ matter: "1e28" }))).toEqual([]);
  });

  it("kademe sayısı = hedef, dolu olan = kazanılan", () => {
    const empty = navSilhouetteStepFlags(NAV_FEATURE_IDS.crisis, makeContext({ matter: "1e28" }));
    expect(empty).toEqual([false, false]);

    const half = navSilhouetteStepFlags(
      NAV_FEATURE_IDS.crisis,
      makeContext({ matter: "1e28", achievements: ["cri_first"] })
    );
    expect(half).toEqual([true, false]);
  });
});

describe("nextUnlockLabelFor — 'Sıradaki Açılacak' bandı ipucu", () => {
  it("dal kapılı açılışta BAŞARIM ŞARTI ipucu ekler (hedef bilgisi, kilitli içerik değil)", () => {
    // crisis dalı: "Kozmik Dalgalanmalar" ailesinden 2 başarım gerekiyor (BRANCH_GATES).
    // Dekad eşiği (1e28) geçti, 1 güvenli başarım kazanıldı → hâlâ kapalı.
    const ctx = makeContext({ matter: "1e28", achievements: ["cri_first"] });
    const crisis = getFeatureById("crisis");
    expect(crisis).not.toBeNull();

    const label = nextUnlockLabelFor(crisis, ctx);
    expect(label).toBe(
      `${crisis!.name} · ${crisis!.hint} · 2 Kozmik Dalgalanmalar başarımı (1/2)`
    );
    expect(label).toContain("2 Kozmik Dalgalanmalar başarımı");
    expect(label).toContain("(1/2)");

    // Aynı bilgi ayrı yardımcıdan da gelir (boş string = ipucu yok).
    expect(branchAchievementHint(crisis, ctx)).toBe("2 Kozmik Dalgalanmalar başarımı (1/2)");
  });

  it("omurga (dal kapısı olmayan) açılışta etiket DEĞİŞMEZ — ipucu eklenmez", () => {
    // stance_spam omurga özelliği: BRANCH_GATES kaydı yok, dekad eşiği (1e20) açar.
    const ctx = makeContext({ matter: "1e19" });
    const spine = getFeatureById("stance_spam");
    expect(spine).not.toBeNull();
    expect(getBranchGate("stance_spam")).toBeNull();

    const label = nextUnlockLabelFor(spine, ctx);
    expect(label).toBe(`${spine!.name} · ${spine!.hint}`);
    expect(label).not.toContain("başarımı");
    expect(branchAchievementHint(spine, ctx)).toBe("");
  });
});
