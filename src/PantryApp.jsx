import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Plus,
  X,
  CheckCircle2,
  Circle,
  ChefHat,
  Refrigerator,
  UtensilsCrossed,
  Trash2,
  Settings,
  ShoppingCart,
  Pencil,
  Check,
} from "lucide-react";

/* ---------------------------------------------------------
   クイック追加候補の初期値（食材タブ用、設定画面で編集可能）
--------------------------------------------------------- */
const DEFAULT_QUICK_ADD = [
  { category: "野菜", items: ["玉ねぎ", "じゃがいも", "にんじん", "キャベツ", "もやし", "ピーマン", "長ねぎ", "にんにく", "生姜", "なす", "トマト", "きゅうり", "レタス", "白菜", "れんこん", "ごぼう"] },
  { category: "肉・魚", items: ["豚肉", "鶏肉", "合いびき肉", "豚ひき肉", "鮭"] },
  { category: "卵・豆腐", items: ["卵", "豆腐"] },
  { category: "調味料", items: ["しょうゆ", "みりん", "酒", "砂糖", "味噌", "ケチャップ", "ソース", "カレールー", "豆板醤", "ごま油", "マヨネーズ", "塩", "だし", "片栗粉"] },
  { category: "主食・その他", items: ["米", "パスタ", "焼きそば麺", "餃子の皮", "小麦粉", "ハム", "にら", "きのこ", "こんにゃく", "わかめ", "かつお節", "ドレッシング", "トマト缶"] },
];

const CATEGORY_ORDER = ["野菜", "肉・魚", "卵・豆腐", "調味料", "主食・その他", "その他"];

function categoryOf(name, quickAdd) {
  for (const group of quickAdd) {
    if (group.items.includes(name)) return group.category;
  }
  return "その他";
}

const PANTRY_KEY = "pantry-items";
const QUICK_ADD_KEY = "quick-add-list";
const RECIPES_KEY = "recipes";



/* ---------------------------------------------------------
   メインアプリ
--------------------------------------------------------- */
export default function PantryApp() {
  const [tab, setTab] = useState("dishes"); // "dishes" | "pantry"
  const [pantry, setPantry] = useState([]); // array of strings
  const [loaded, setLoaded] = useState(false);
  const [newItem, setNewItem] = useState("");
  const [onlyMakeable, setOnlyMakeable] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [quickAdd, setQuickAdd] = useState(DEFAULT_QUICK_ADD);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsCategory, setSettingsCategory] = useState(DEFAULT_QUICK_ADD[0].category);
  const [settingsNewItem, setSettingsNewItem] = useState("");
  const [showAddRecipe, setShowAddRecipe] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState(null);
  const [draftName, setDraftName] = useState("");
  const [draftServings, setDraftServings] = useState("");
  const [draftExpiry, setDraftExpiry] = useState(""); // "YYYY-MM-DD"
  const [draftIngredients, setDraftIngredients] = useState([]);
  const [draftIngredientInput, setDraftIngredientInput] = useState("");
  const [saveError, setSaveError] = useState("");

  // 起動時に保存データを読み込む（localStorageは同期処理なのでasync/awaitは不要）
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PANTRY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // オブジェクト形式（旧・食数管理版）からの移行
        const migrated = parsed.map((p) => (typeof p === "string" ? p : p.name));
        setPantry(migrated);
      }
    } catch (e) {
      /* 壊れたデータ or 未保存なら何もしない（初回利用） */
    }
    try {
      const raw = localStorage.getItem(RECIPES_KEY);
      if (raw) setRecipes(JSON.parse(raw));
    } catch (e) {
      /* 壊れたデータ or 未保存なら何もしない */
    }
    try {
      const raw = localStorage.getItem(QUICK_ADD_KEY);
      if (raw) setQuickAdd(JSON.parse(raw));
    } catch (e) {
      /* 壊れたデータ or 未保存なら初期値のまま */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded && recipes.length === 0) setShowAddRecipe(true);
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // localStorageへの保存。容量オーバーやプライベートブラウジングでの
  // 書き込み禁止など、ごく稀な失敗時だけユーザーに通知する。
  // （ネットワーク通信ではないため、window.storage版にあったリトライは不要）
  const persist = useCallback((key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      setSaveError(
        `保存に失敗しました。ブラウザの空き容量を確認するか、プライベートブラウジングを解除してください（${
          e && e.message ? e.message : String(e)
        }）`
      );
      setTimeout(() => setSaveError(""), 6000);
    }
  }, []);

  const persistPantry = useCallback((next) => persist(PANTRY_KEY, JSON.stringify(next)), [persist]);
  const persistRecipes = useCallback((next) => persist(RECIPES_KEY, JSON.stringify(next)), [persist]);
  const persistQuickAdd = useCallback((next) => persist(QUICK_ADD_KEY, JSON.stringify(next)), [persist]);

  const addCandidateItem = () => {
    const name = settingsNewItem.trim();
    if (!name) return;
    const next = quickAdd.map((g) =>
      g.category === settingsCategory && !g.items.includes(name) ? { ...g, items: [...g.items, name] } : g
    );
    setQuickAdd(next);
    persistQuickAdd(next);
    setSettingsNewItem("");
  };

  const removeCandidateItem = (category, name) => {
    const next = quickAdd.map((g) => (g.category === category ? { ...g, items: g.items.filter((i) => i !== name) } : g));
    setQuickAdd(next);
    persistQuickAdd(next);
  };

  const addItem = (raw) => {
    const name = raw.trim();
    if (!name) return;
    if (pantry.includes(name)) return;
    const next = [...pantry, name];
    setPantry(next);
    persistPantry(next);
    setNewItem("");
  };

  const removeItem = (name) => {
    const next = pantry.filter((p) => p !== name);
    setPantry(next);
    persistPantry(next);
  };

  const clearPantry = () => {
    setPantry([]);
    persistPantry([]);
  };

  const addDraftIngredient = () => {
    const name = draftIngredientInput.trim();
    if (!name) return;
    if (draftIngredients.some((i) => i.name === name)) {
      setDraftIngredientInput("");
      return;
    }
    setDraftIngredients([...draftIngredients, { name, has: true }]);
    setDraftIngredientInput("");
  };

  const toggleDraftIngredientHas = (name) => {
    setDraftIngredients(draftIngredients.map((i) => (i.name === name ? { ...i, has: !i.has } : i)));
  };

  const removeDraftIngredient = (name) => {
    setDraftIngredients(draftIngredients.filter((i) => i.name !== name));
  };

  const resetDraft = () => {
    setDraftName("");
    setDraftServings("");
    setDraftExpiry("");
    setDraftIngredients([]);
    setDraftIngredientInput("");
    setEditingRecipeId(null);
  };

  const openAddRecipe = () => {
    resetDraft();
    setShowAddRecipe(true);
  };

  const openEditRecipe = (recipe) => {
    setEditingRecipeId(recipe.id);
    setDraftName(recipe.name);
    setDraftServings(recipe.servings ? String(recipe.servings) : "");
    setDraftExpiry(recipe.expiry || "");
    setDraftIngredients(recipe.ingredients.map((name) => ({ name, has: pantrySet.has(name) })));
    setDraftIngredientInput("");
    setShowAddRecipe(true);
  };

  const closeRecipeModal = () => {
    setShowAddRecipe(false);
    resetDraft();
  };

  const saveRecipe = () => {
    const name = draftName.trim();
    const ings = draftIngredients;
    if (!name) {
      setSaveError("料理名を入力してください。");
      setTimeout(() => setSaveError(""), 3000);
      return;
    }
    const servingsNum = parseInt(draftServings, 10);
    const servings = Number.isFinite(servingsNum) && servingsNum > 0 ? servingsNum : null;
    const expiry = draftExpiry || null;

    let nextRecipes;
    if (editingRecipeId) {
      nextRecipes = recipes.map((r) =>
        r.id === editingRecipeId ? { ...r, name, ingredients: ings.map((i) => i.name), servings, expiry } : r
      );
    } else {
      const recipe = { id: `recipe-${Date.now()}`, name, ingredients: ings.map((i) => i.name), servings, expiry };
      nextRecipes = [...recipes, recipe];
    }
    setRecipes(nextRecipes);
    persistRecipes(nextRecipes);

    // 「ある」→食材に追加、「ない」→食材から外す（食材は全料理で共通）
    const additions = ings.filter((i) => i.has && !pantrySet.has(i.name)).map((i) => i.name);
    const removals = new Set(ings.filter((i) => !i.has && pantrySet.has(i.name)).map((i) => i.name));
    if (additions.length > 0 || removals.size > 0) {
      const nextPantry = [...pantry.filter((p) => !removals.has(p)), ...additions];
      setPantry(nextPantry);
      persistPantry(nextPantry);
    }

    setShowAddRecipe(false);
    resetDraft();
  };

  const removeRecipe = (id) => {
    const next = recipes.filter((r) => r.id !== id);
    setRecipes(next);
    persistRecipes(next);
  };

  const eatRecipe = (id) => {
    const recipe = recipes.find((r) => r.id === id);
    if (!recipe) return;
    if (!recipe.servings || recipe.servings <= 1) {
      removeRecipe(id);
    } else {
      const next = recipes.map((r) => (r.id === id ? { ...r, servings: r.servings - 1 } : r));
      setRecipes(next);
      persistRecipes(next);
    }
  };

  const pantrySet = useMemo(() => new Set(pantry), [pantry]);

  const enrichedRecipes = useMemo(() => {
    return recipes.map((r) => {
      const have = r.ingredients.filter((i) => pantrySet.has(i));
      const missing = r.ingredients.filter((i) => !pantrySet.has(i));
      return { ...r, have, missing };
    });
  }, [recipes, pantrySet]);

  const visibleRecipes = useMemo(() => {
    let list = enrichedRecipes;
    if (onlyMakeable) {
      list = list.filter((r) => r.missing.length === 0);
    }
    return [...list].sort((a, b) => {
      if (a.missing.length !== b.missing.length) return a.missing.length - b.missing.length;
      if (a.expiry && b.expiry) return a.expiry.localeCompare(b.expiry);
      if (a.expiry) return -1;
      if (b.expiry) return 1;
      return a.name.localeCompare(b.name, "ja");
    });
  }, [enrichedRecipes, onlyMakeable]);

  const makeableCount = enrichedRecipes.filter((r) => r.missing.length === 0).length;

  const shoppingList = useMemo(() => {
    const map = new Map();
    for (const r of enrichedRecipes) {
      for (const name of r.missing) {
        if (!map.has(name)) map.set(name, []);
        map.get(name).push(r.name);
      }
    }
    return Array.from(map.entries())
      .map(([name, recipeNames]) => ({ name, recipeNames }))
      .sort((a, b) => b.recipeNames.length - a.recipeNames.length || a.name.localeCompare(b.name, "ja"));
  }, [enrichedRecipes]);

  const groupedPantry = useMemo(() => {
    const groups = {};
    for (const name of pantry) {
      const cat = categoryOf(name, quickAdd);
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(name);
    }
    return groups;
  }, [pantry, quickAdd]);

  const paper = "#FFF6FB";
  const ink = "#6B4E78";
  const primary = "#9B7FD4";
  const gold = "#B9C6F2";
  const accent = "#FF8FC4";
  const cardAlt = "#FBE6F5";
  const muted = "#B295BE";

  if (!loaded) {
    return (
      <div
        style={{
          fontFamily: "'Yomogi', sans-serif",
          background: paper,
          color: muted,
          minHeight: 400,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 16,
        }}
      >
        読み込み中…
      </div>
    );
  }

  return (
    <div
      style={{
        background: paper,
        color: ink,
        fontFamily: "'Yomogi', sans-serif",
        minHeight: 600,
        borderRadius: 24,
        overflow: "hidden",
        border: `1px solid ${cardAlt}`,
        boxShadow: "0 8px 28px rgba(155,127,212,0.18)",
        maxWidth: 780,
        margin: "0 auto",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Hachi+Maru+Pop&family=Yomogi&family=M+PLUS+Rounded+1c:wght@400;500;700;800&display=swap');
        .pa-scroll::-webkit-scrollbar { display: none; }
        .pa-scroll { -ms-overflow-style: none; scrollbar-width: none; }
        .pa-chip { transition: background .15s ease, transform .1s ease; }
        .pa-chip:active { transform: scale(0.96); }
        .pa-tab-btn { transition: background .15s ease, color .15s ease; }
      `}</style>

      {/* ヘッダー */}
      <div style={{ background: primary, color: paper, padding: "22px 24px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <ChefHat size={26} strokeWidth={1.75} />
          <h1
            style={{
              fontFamily: "'Hachi Maru Pop', sans-serif",
              fontWeight: 700,
              fontSize: 26,
              margin: 0,
              letterSpacing: "0.01em",
            }}
          >
            うちの台所
          </h1>
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 13.5, opacity: 0.85, letterSpacing: "0.02em" }}>
          家にある食材で、今つくれる料理を見つける
        </p>

        {/* タブ */}
        <div style={{ display: "flex", gap: 6, marginTop: 18 }}>
          <button
            className="pa-tab-btn"
            onClick={() => setTab("dishes")}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              padding: "9px 6px",
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
              whiteSpace: "nowrap",
              background: tab === "dishes" ? paper : "rgba(255,255,255,0.12)",
              color: tab === "dishes" ? primary : paper,
            }}
          >
            <UtensilsCrossed size={14} /> 料理 ({makeableCount})
          </button>
          <button
            className="pa-tab-btn"
            onClick={() => setTab("pantry")}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              padding: "9px 6px",
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
              whiteSpace: "nowrap",
              background: tab === "pantry" ? paper : "rgba(255,255,255,0.12)",
              color: tab === "pantry" ? primary : paper,
            }}
          >
            <Refrigerator size={14} /> 食材 ({pantry.length})
          </button>
          <button
            className="pa-tab-btn"
            onClick={() => setTab("shopping")}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 4,
              padding: "9px 6px",
              borderRadius: 10,
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 500,
              whiteSpace: "nowrap",
              background: tab === "shopping" ? paper : "rgba(255,255,255,0.12)",
              color: tab === "shopping" ? primary : paper,
            }}
          >
            <ShoppingCart size={14} /> 買い物 ({shoppingList.length})
          </button>
        </div>
      </div>

      {saveError && (
        <div style={{ background: accent, color: paper, fontSize: 12.5, padding: "6px 24px" }}>{saveError}</div>
      )}

      <div style={{ padding: "20px 24px 28px" }}>
        {tab === "pantry" ? (
          <div>
            {/* 追加フォーム */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 22 }}>
              <input
                value={newItem}
                onChange={(e) => setNewItem(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addItem(newItem)}
                placeholder="食材名を入力（例：玉ねぎ）"
                style={{
                  width: "100%",
                  boxSizing: "border-box",
                  minWidth: 0,
                  padding: "9px 12px",
                  borderRadius: 9,
                  border: `1px solid ${cardAlt}`,
                  background: "#fff",
                  fontSize: 16,
                  color: ink,
                  outline: "none",
                }}
              />
              <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowQuickAddModal(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "9px 14px",
                  borderRadius: 9,
                  border: `1px dashed ${muted}`,
                  background: "none",
                  color: muted,
                  fontSize: 13.5,
                  cursor: "pointer",
                  flex: "0 0 auto",
                  whiteSpace: "nowrap",
                }}
              >
                候補から追加
              </button>
              <button
                onClick={() => addItem(newItem)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "9px 14px",
                  borderRadius: 9,
                  border: "none",
                  background: primary,
                  color: paper,
                  fontSize: 13.5,
                  fontWeight: 500,
                  cursor: "pointer",
                  flex: 1,
                  justifyContent: "center",
                }}
              >
                <Plus size={15} /> 追加
              </button>
              </div>
            </div>

            {/* 現在の食材一覧 */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <p style={{ fontSize: 12, color: muted, margin: 0, letterSpacing: "0.04em" }}>
                いま家にある食材（{pantry.length}）
              </p>
              {pantry.length > 0 && (
                <button
                  onClick={clearPantry}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 11.5,
                    color: accent,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <Trash2 size={12} /> すべて削除
                </button>
              )}
            </div>

            {pantry.length === 0 ? (
              <div
                style={{
                  border: `1px dashed ${cardAlt}`,
                  borderRadius: 12,
                  padding: "26px 16px",
                  textAlign: "center",
                  color: muted,
                  fontSize: 13,
                }}
              >
                まだ食材が登録されていません。上のチップをタップして追加してください。
              </div>
            ) : (
              CATEGORY_ORDER.filter((cat) => groupedPantry[cat]?.length).map((cat) => (
                <div key={cat} style={{ marginBottom: 12 }}>
                  <p
                    style={{
                      fontFamily: "'Yomogi', sans-serif",
                      fontSize: 10.5,
                      color: muted,
                      margin: "0 0 6px",
                      letterSpacing: "0.06em",
                    }}
                  >
                    {cat}
                  </p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {groupedPantry[cat].map((item) => (
                      <span
                        key={item}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "6px 6px 6px 12px",
                          borderRadius: 999,
                          background: cardAlt,
                          fontSize: 13,
                          color: ink,
                        }}
                      >
                        {item}
                        <button
                          onClick={() => removeItem(item)}
                          aria-label={`${item}を削除`}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 18,
                            height: 18,
                            borderRadius: "50%",
                            border: "none",
                            background: "rgba(0,0,0,0.08)",
                            cursor: "pointer",
                            color: ink,
                            flexShrink: 0,
                          }}
                        >
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}

            {/* 候補から追加モーダル */}
            {showQuickAddModal && (
              <div
                onClick={() => setShowQuickAddModal(false)}
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(36,48,31,0.45)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 50,
                  padding: 20,
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: paper,
                    borderRadius: 22,
                    padding: 20,
                    boxSizing: "border-box",
                    overflow: "hidden",
                    boxShadow: "0 10px 30px rgba(155,127,212,0.28)",
                    width: "100%",
                    maxWidth: 380,
                    maxHeight: "80vh",
                    overflowY: "auto",
                    border: `1px solid ${cardAlt}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <p
                      style={{
                        fontFamily: "'Hachi Maru Pop', sans-serif",
                        fontWeight: 700,
                        fontSize: 17,
                        margin: 0,
                        color: ink,
                      }}
                    >
                      候補から追加
                    </p>
                    <button
                      onClick={() => {
                        setShowQuickAddModal(false);
                        setShowSettingsModal(true);
                      }}
                      aria-label="候補を編集"
                      style={{
                        marginLeft: "auto",
                        marginRight: 4,
                        border: "none",
                        background: "none",
                        cursor: "pointer",
                        color: muted,
                        display: "flex",
                      }}
                    >
                      <Settings size={17} />
                    </button>
                    <button
                      onClick={() => setShowQuickAddModal(false)}
                      aria-label="閉じる"
                      style={{ border: "none", background: "none", cursor: "pointer", color: muted, display: "flex" }}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  {quickAdd.map((group) => (
                    <div key={group.category} style={{ marginBottom: 12 }}>
                      <p
                        style={{
                          fontFamily: "'Yomogi', sans-serif",
                          fontSize: 10.5,
                          color: muted,
                          margin: "0 0 6px",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {group.category}
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {group.items.map((item) => {
                          const has = pantrySet.has(item);
                          return (
                            <button
                              key={item}
                              className="pa-chip"
                              onClick={() => (has ? removeItem(item) : addItem(item))}
                              style={{
                                padding: "6px 12px",
                                borderRadius: 999,
                                border: `1px solid ${has ? primary : cardAlt}`,
                                background: has ? primary : "#fff",
                                color: has ? paper : ink,
                                fontSize: 12.5,
                                cursor: "pointer",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {item}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 候補を編集モーダル */}
            {showSettingsModal && (
              <div
                onClick={() => {
                  setShowSettingsModal(false);
                  setSettingsNewItem("");
                }}
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(36,48,31,0.45)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 50,
                  padding: 20,
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: paper,
                    borderRadius: 22,
                    padding: 20,
                    boxSizing: "border-box",
                    overflow: "hidden",
                    boxShadow: "0 10px 30px rgba(155,127,212,0.28)",
                    width: "100%",
                    maxWidth: 380,
                    maxHeight: "80vh",
                    overflowY: "auto",
                    border: `1px solid ${cardAlt}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <p
                      style={{
                        fontFamily: "'Hachi Maru Pop', sans-serif",
                        fontWeight: 700,
                        fontSize: 17,
                        margin: 0,
                        color: ink,
                      }}
                    >
                      候補を編集
                    </p>
                    <button
                      onClick={() => {
                        setShowSettingsModal(false);
                        setSettingsNewItem("");
                      }}
                      aria-label="閉じる"
                      style={{ border: "none", background: "none", cursor: "pointer", color: muted, display: "flex" }}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                    <select
                      value={settingsCategory}
                      onChange={(e) => setSettingsCategory(e.target.value)}
                      style={{
                        padding: "9px 26px 9px 10px",
                        borderRadius: 9,
                        border: `1px solid ${cardAlt}`,
                        fontSize: 16,
                        background: `#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23B295BE' stroke-width='1.6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 10px center`,
                        color: ink,
                        appearance: "none",
                        WebkitAppearance: "none",
                        MozAppearance: "none",
                        boxSizing: "border-box",
                        flexShrink: 0,
                      }}
                    >
                      {quickAdd.map((g) => (
                        <option key={g.category} value={g.category}>
                          {g.category}
                        </option>
                      ))}
                    </select>
                    <input
                      value={settingsNewItem}
                      onChange={(e) => setSettingsNewItem(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCandidateItem()}
                      placeholder="候補名を入力"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: "9px 12px",
                        borderRadius: 9,
                        border: `1px solid ${cardAlt}`,
                        fontSize: 16,
                        boxSizing: "border-box",
                        outline: "none",
                        background: "#fff",
                      }}
                    />
                    <button
                      onClick={addCandidateItem}
                      aria-label="候補を追加"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 38,
                        borderRadius: 9,
                        border: "none",
                        background: primary,
                        color: paper,
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {quickAdd.map((group) => (
                    <div key={group.category} style={{ marginBottom: 12 }}>
                      <p
                        style={{
                          fontFamily: "'Yomogi', sans-serif",
                          fontSize: 10.5,
                          color: muted,
                          margin: "0 0 6px",
                          letterSpacing: "0.06em",
                        }}
                      >
                        {group.category}
                      </p>
                      {group.items.length === 0 ? (
                        <p style={{ fontSize: 12, color: muted, margin: 0 }}>候補がありません。</p>
                      ) : (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {group.items.map((item) => (
                            <span
                              key={item}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "6px 6px 6px 12px",
                                borderRadius: 999,
                                background: cardAlt,
                                fontSize: 13,
                                color: ink,
                              }}
                            >
                              {item}
                              <button
                                onClick={() => removeCandidateItem(group.category, item)}
                                aria-label={`${item}を候補から削除`}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: 18,
                                  height: 18,
                                  borderRadius: "50%",
                                  border: "none",
                                  background: "rgba(0,0,0,0.08)",
                                  cursor: "pointer",
                                  color: ink,
                                }}
                              >
                                <X size={11} />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : tab === "dishes" ? (
          <div>
            {/* 料理を追加 */}
            <button
              onClick={openAddRecipe}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "10px 14px",
                borderRadius: 10,
                border: `1px dashed ${muted}`,
                background: "none",
                color: muted,
                fontSize: 13,
                cursor: "pointer",
                width: "100%",
                justifyContent: "center",
                marginBottom: 16,
              }}
            >
              <Plus size={14} /> 料理を追加する
            </button>

            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                marginBottom: 16,
                fontSize: 13,
                color: ink,
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              <input
                type="checkbox"
                checked={onlyMakeable}
                onChange={(e) => setOnlyMakeable(e.target.checked)}
                style={{ accentColor: primary, width: 15, height: 15 }}
              />
              作れる料理だけ表示する
            </label>

            {pantry.length === 0 && recipes.length > 0 && (
              <div
                style={{
                  border: `1px dashed ${cardAlt}`,
                  borderRadius: 12,
                  padding: "16px",
                  marginBottom: 16,
                  color: muted,
                  fontSize: 13,
                }}
              >
                「食材」タブでいまある食材を登録すると、判定が始まります。
              </div>
            )}

            {/* レシピカード一覧 */}
            {recipes.length === 0 ? (
              <div
                style={{
                  border: `1px dashed ${cardAlt}`,
                  borderRadius: 12,
                  padding: "28px 16px",
                  textAlign: "center",
                  color: muted,
                  fontSize: 13,
                  marginBottom: 16,
                }}
              >
                まだ料理が登録されていません。上の「料理を追加する」からよく作る料理を登録してください。
              </div>
            ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {visibleRecipes.length === 0 && (
                <div style={{ color: muted, fontSize: 13, padding: "12px 0" }}>該当する料理が見つかりませんでした。</div>
              )}
              {visibleRecipes.map((r) => (
                <div
                  key={r.id}
                  style={{
                    position: "relative",
                    background: "#fff",
                    border: `1px solid ${cardAlt}`,
                    borderRadius: 20,
                    padding: "16px 18px",
                    boxShadow: "0 4px 14px rgba(155,127,212,0.15)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                    <h3
                      style={{
                        fontFamily: "'Hachi Maru Pop', sans-serif",
                        fontWeight: 700,
                        fontSize: 17.5,
                        margin: 0,
                        color: ink,
                        wordBreak: "keep-all",
                        overflowWrap: "anywhere",
                      }}
                    >
                      {r.name}
                    </h3>
                    {(r.servings || r.expiry) && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
                    {r.servings && (
                      <span
                        style={{
                          fontFamily: "'Yomogi', sans-serif",
                          fontSize: 11,
                          fontWeight: 700,
                          color: primary,
                          background: "#EDE3FA",
                          padding: "3px 8px",
                          borderRadius: 999,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.servings}人前
                      </span>
                    )}
                    {r.expiry && (
                      <span
                        style={{
                          fontFamily: "'Yomogi', sans-serif",
                          fontSize: 11,
                          fontWeight: 700,
                          color: accent,
                          background: "#FFE3F0",
                          padding: "3px 8px",
                          borderRadius: 999,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {r.expiry}
                      </span>
                    )}
                    </div>
                    )}
                    </div>
                    <button
                      onClick={() => openEditRecipe(r)}
                      aria-label="この料理を編集"
                      style={{
                        flexShrink: 0,
                        padding: "6px 2px",
                        border: "none",
                        background: "none",
                        color: muted,
                        cursor: "pointer",
                        display: "flex",
                      }}
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => eatRecipe(r.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "5px 10px",
                        borderRadius: 999,
                        border: `1px solid ${primary}`,
                        background: "none",
                        color: primary,
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: "pointer",
                        flexShrink: 0,
                        whiteSpace: "nowrap",
                      }}
                    >
                      <Check size={13} /> 食べた
                    </button>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px" }}>
                    {r.ingredients.map((ing) => {
                      const has = pantrySet.has(ing);
                      return (
                        <span
                          key={ing}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 5,
                            fontSize: 13,
                            color: has ? ink : accent,
                            textDecoration: has ? "none" : "line-through",
                            opacity: has ? 1 : 0.75,
                          }}
                        >
                          {has ? (
                            <CheckCircle2 size={13} color={primary} />
                          ) : (
                            <Circle size={13} color={accent} strokeWidth={2} />
                          )}
                          {ing}
                        </span>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            )}

            {/* 料理追加ポップアップ */}
            {showAddRecipe && (
              <div
                onClick={closeRecipeModal}
                style={{
                  position: "fixed",
                  inset: 0,
                  background: "rgba(36,48,31,0.45)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  zIndex: 50,
                  padding: 20,
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: paper,
                    borderRadius: 22,
                    padding: 20,
                    boxSizing: "border-box",
                    overflow: "hidden",
                    boxShadow: "0 10px 30px rgba(155,127,212,0.28)",
                    width: "100%",
                    maxWidth: 360,
                    border: `1px solid ${cardAlt}`,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <p
                      style={{
                        fontFamily: "'Hachi Maru Pop', sans-serif",
                        fontWeight: 700,
                        fontSize: 17,
                        margin: 0,
                        color: ink,
                      }}
                    >
                      {editingRecipeId ? "料理を編集" : "料理を追加"}
                    </p>
                    <button
                      onClick={closeRecipeModal}
                      aria-label="閉じる"
                      style={{ border: "none", background: "none", cursor: "pointer", color: muted, display: "flex" }}
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                    <input
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      placeholder="料理名（例：ハンバーグ）"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: "9px 12px",
                        borderRadius: 9,
                        border: `1px solid ${cardAlt}`,
                        fontSize: 16,
                        boxSizing: "border-box",
                        outline: "none",
                        background: "#fff",
                      }}
                    />
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      <select
                        value={draftServings}
                        onChange={(e) => setDraftServings(e.target.value)}
                        style={{
                          width: 68,
                          padding: "9px 22px 9px 10px",
                          borderRadius: 9,
                          border: `1px solid ${cardAlt}`,
                          fontSize: 16,
                          textAlign: "center",
                          boxSizing: "border-box",
                          outline: "none",
                          background: `#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23B295BE' stroke-width='1.6' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") no-repeat right 8px center`,
                          color: draftServings ? ink : muted,
                          appearance: "none",
                          WebkitAppearance: "none",
                          MozAppearance: "none",
                          flexShrink: 0,
                        }}
                      >
                        <option value="">−</option>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                      <span style={{ fontSize: 13, color: muted, whiteSpace: "nowrap" }}>人前</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: muted, whiteSpace: "nowrap" }}>賞味期限</span>
                    <input
                      type="date"
                      value={draftExpiry}
                      onChange={(e) => setDraftExpiry(e.target.value)}
                      aria-label="賞味期限"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: "8px 10px",
                        borderRadius: 9,
                        border: `1px solid ${cardAlt}`,
                        fontSize: 16,
                        color: draftExpiry ? ink : muted,
                        boxSizing: "border-box",
                        outline: "none",
                        background: "#fff",
                      }}
                    />
                    {draftExpiry && (
                      <button
                        onClick={() => setDraftExpiry("")}
                        aria-label="賞味期限をクリア"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          border: "none",
                          background: "rgba(0,0,0,0.08)",
                          cursor: "pointer",
                          color: ink,
                          flexShrink: 0,
                        }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: 11.5, color: muted, margin: "2px 0 6px", letterSpacing: "0.03em" }}>必要な食材</p>
                  <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                    <input
                      value={draftIngredientInput}
                      onChange={(e) => setDraftIngredientInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addDraftIngredient();
                        }
                      }}
                      placeholder="食材名を入力（例：玉ねぎ）"
                      style={{
                        flex: 1,
                        minWidth: 0,
                        padding: "9px 12px",
                        borderRadius: 9,
                        border: `1px solid ${cardAlt}`,
                        fontSize: 16,
                        boxSizing: "border-box",
                        outline: "none",
                        background: "#fff",
                      }}
                    />
                    <button
                      onClick={addDraftIngredient}
                      aria-label="食材を追加"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 38,
                        borderRadius: 9,
                        border: "none",
                        background: primary,
                        color: paper,
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {draftIngredients.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 6 }}>
                      {draftIngredients.map((ing) => {
                        const has = ing.has;
                        return (
                          <span
                            key={ing.name}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 5,
                              padding: "5px 5px 5px 5px",
                              borderRadius: 999,
                              fontSize: 12.5,
                              background: has ? "#EDE3FA" : "#FFE3F0",
                              color: has ? primary : accent,
                              border: `1px solid ${has ? primary : accent}`,
                            }}
                          >
                            <button
                              onClick={() => toggleDraftIngredientHas(ing.name)}
                              aria-label={has ? `${ing.name}を「ない」にする` : `${ing.name}を「ある」にする`}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 4,
                                border: "none",
                                background: "none",
                                cursor: "pointer",
                                color: "inherit",
                                padding: "2px 2px 2px 6px",
                                font: "inherit",
                              }}
                            >
                              {has ? <CheckCircle2 size={12} /> : <Circle size={12} strokeWidth={2} />}
                              {ing.name}
                            </button>
                            <button
                              onClick={() => removeDraftIngredient(ing.name)}
                              aria-label={`${ing.name}を削除`}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                width: 15,
                                height: 15,
                                borderRadius: "50%",
                                border: "none",
                                background: "rgba(0,0,0,0.08)",
                                cursor: "pointer",
                                color: "inherit",
                                flexShrink: 0,
                              }}
                            >
                              <X size={9} />
                            </button>
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {saveError && <p style={{ color: accent, fontSize: 12.5, margin: "0 0 10px" }}>{saveError}</p>}
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <button
                      onClick={closeRecipeModal}
                      style={{
                        flex: 1,
                        padding: "9px 16px",
                        borderRadius: 9,
                        border: `1px solid ${cardAlt}`,
                        background: "#fff",
                        color: ink,
                        fontSize: 13.5,
                        cursor: "pointer",
                      }}
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={saveRecipe}
                      style={{
                        flex: 1,
                        padding: "9px 16px",
                        borderRadius: 9,
                        border: "none",
                        background: primary,
                        color: paper,
                        fontSize: 13.5,
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      {editingRecipeId ? "更新する" : "保存する"}
                    </button>
                  </div>
                  {editingRecipeId && (
                    <button
                      onClick={() => {
                        removeRecipe(editingRecipeId);
                        closeRecipeModal();
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                        width: "100%",
                        marginTop: 10,
                        padding: "7px 10px",
                        borderRadius: 9,
                        border: "none",
                        background: "none",
                        color: accent,
                        fontSize: 12.5,
                        cursor: "pointer",
                      }}
                    >
                      <Trash2 size={12} /> この料理を削除する
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            {shoppingList.length === 0 ? (
              <div
                style={{
                  border: `1px dashed ${cardAlt}`,
                  borderRadius: 12,
                  padding: "28px 16px",
                  textAlign: "center",
                  color: muted,
                  fontSize: 13,
                }}
              >
                {recipes.length === 0
                  ? "料理を登録すると、足りない食材がここに表示されます。"
                  : "今のところ、買わなければいけない食材はありません。"}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {shoppingList.map((item) => (
                  <div
                    key={item.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      background: "#fff",
                      border: `1px solid ${cardAlt}`,
                      borderRadius: 12,
                      padding: "12px 14px",
                    }}
                  >
                    <Circle size={15} color={accent} strokeWidth={2} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14.5, color: ink }}>{item.name}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 11.5, color: muted }}>
                        {item.recipeNames.join("、")}で使用
                      </p>
                    </div>
                    <button
                      onClick={() => addItem(item.name)}
                      style={{
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "7px 12px",
                        borderRadius: 9,
                        border: "none",
                        background: primary,
                        color: paper,
                        fontSize: 12.5,
                        fontWeight: 500,
                        cursor: "pointer",
                      }}
                    >
                      <Plus size={13} /> 買った
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}