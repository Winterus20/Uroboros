import { ref, onMounted, onUnmounted } from "vue";
import { useGameStore } from "../stores/game";
import { sounds } from "../core/audio";
import { TAB_ORDER } from "./useNavigation";
import type { TabId } from "./useNavigation";

// ADR-0029: bozuk kayıt / gelecek sürüm durumlarını oyuncuya göster
export interface SaveIssue {
  kind: "future" | "recovered" | "lost";
  title: string;
  message: string;
}

export function useModals(options: {
  switchTab: (tab: TabId) => void;
  switchTabByOffset: (direction: 1 | -1) => void;
}) {
  const store = useGameStore();

  const showSettings = ref(false);
  const showAdmin = ref(false);
  const saveIssue = ref<SaveIssue | null>(null);
  let godmodeBuffer = "";

  // Gizli Admin Paneli: klavyede GODMODE yazınca aç/kapat + QoL kısayolları (1-9 sekme, M=Tümü, Esc=modal)
  function handleGodmode(e: KeyboardEvent) {
    if (e.key === "Escape") {
      if (showAdmin.value) {
        showAdmin.value = false;
        return;
      }
      if (showSettings.value) {
        showSettings.value = false;
        return;
      }
    }
    // Yazı alanlarında kısayol çalışmaz (import/export textarea, admin input'ları, seçim kutuları, düzenlenebilir alanlar)
    const target = e.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable)) return;

    // GODMODE gizli kodu kısayollardan ÖNCE kontrol edilir — yoksa 'm' (Max All)
    // kodu böler ve panel asla açılmaz. Kodun öneki yazılırken kısayol tetiklenmez.
    if (e.key.length === 1) {
      const candidate = (godmodeBuffer + e.key.toLowerCase()).slice(-7);
      if (candidate === "godmode") {
        godmodeBuffer = "";
        showAdmin.value = !showAdmin.value;
        sounds.playAnomaly();
        return;
      }
      if ("godmode".startsWith(candidate)) {
        godmodeBuffer = candidate;
        return;
      }
      godmodeBuffer = candidate;
    }

    // Modal açıkken oyun kısayolları (sekme değişimi, Max All vb.) çalıştırılmaz
    if (showSettings.value || showAdmin.value || document.querySelector('.layer-modal, [role="dialog"]')) return;

    // Kısayollar kullanıcı ayarlarında devre dışı bırakılmışsa dur
    if (store.settings.hotkeysEnabled === false) return;

    // 1-9: sekme değiştir
    const idx = Number(e.key);
    if (Number.isInteger(idx) && idx >= 1 && idx <= TAB_ORDER.length) {
      options.switchTab(TAB_ORDER[idx - 1]);
      return;
    }
    if (e.key === "ArrowLeft") {
      options.switchTabByOffset(-1);
      return;
    }
    if (e.key === "ArrowRight") {
      options.switchTabByOffset(1);
      return;
    }
    if (e.key.toLowerCase() === "m") {
      store.maxAll();
      return;
    }
  }

  onMounted(() => {
    // Gizli Admin Paneli: klavyede GODMODE yazınca aç/kapat
    window.addEventListener("keydown", handleGodmode);
  });

  onUnmounted(() => {
    window.removeEventListener("keydown", handleGodmode);
  });

  return {
    showSettings,
    showAdmin,
    saveIssue,
    handleGodmode
  };
}
