// Small persistent stores: the campaign blinding key (session, optionally device) and
// remembered perturber catalogs, so runs opened later get the same treatment automatically.
const KEY_ITEM = "alpaca-analysis.blindingKey";
const CAT_ITEM = "alpaca-analysis.catalogs.v1";

function read(storage, item) { try { return storage.getItem(item); } catch (e) { return null; } }
function write(storage, item, value) { try { if (value === null) storage.removeItem(item); else storage.setItem(item, value); } catch (e) { /* private mode */ } }

export const keyStore = {
  get() { return read(sessionStorage, KEY_ITEM) || read(localStorage, KEY_ITEM) || null; },
  set(key, { remember = false } = {}) { write(sessionStorage, KEY_ITEM, key); if (remember) write(localStorage, KEY_ITEM, key); },
  forget() { write(sessionStorage, KEY_ITEM, null); write(localStorage, KEY_ITEM, null); },
  rememberedOnDevice() { return !!read(localStorage, KEY_ITEM); },
};

function catalogId(cat) {
  const t = cat?.target || {};
  const ids = (cat?.perturbers || []).map((p) => p.id).sort((a, b) => a - b).join(",");
  return `${t.ra_deg ?? "?"}|${t.dec_deg ?? "?"}|${t.z_lens ?? "?"}|${ids}`;
}

export const catalogStore = {
  all() { try { return JSON.parse(read(localStorage, CAT_ITEM) || "[]"); } catch (e) { return []; } },
  remember(cat, label = "") {
    if (!cat || !Array.isArray(cat.perturbers)) return;
    const id = catalogId(cat);
    const list = this.all().filter((c) => c.id !== id);
    list.unshift({ id, label, savedAt: new Date().toISOString(), json: cat });
    write(localStorage, CAT_ITEM, JSON.stringify(list.slice(0, 12)));
  },
  // best remembered catalog for a run: must contain every perturber id the run uses
  find(pertIds) {
    const need = new Set(pertIds);
    for (const c of this.all()) {
      const have = new Set((c.json.perturbers || []).map((p) => +p.id));
      if ([...need].every((i) => have.has(i))) return c;
    }
    return null;
  },
  clear() { write(localStorage, CAT_ITEM, null); },
};
