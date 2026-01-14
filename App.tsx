
import React, { useState, useEffect, useRef } from 'react';
import { Language, AppState, UserProfile, Disease, DietType, Recipe, Region } from './types';
import { TRANSLATIONS, Icons } from './constants';
import { analyzeImageOrText, getSubstitutes } from './geminiService';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('visionchef_state_v2');
    try {
      if (saved) return JSON.parse(saved);
    } catch (e) { console.error(e); }
    
    return {
      language: Language.AR,
      userProfile: {
        diseases: [],
        diet: DietType.NONE,
        mode: 'free',
        region: Region.INTERNATIONAL,
        age: 30, weight: 70, height: 170
      },
      history: []
    };
  });

  const [view, setView] = useState<'home' | 'profile' | 'history' | 'recipe' | 'choices'>('home');
  const [loading, setLoading] = useState(false);
  const [recipeChoices, setRecipeChoices] = useState<Recipe[]>([]);
  const [currentRecipe, setCurrentRecipe] = useState<Recipe | null>(null);
  const [manualIngredients, setManualIngredients] = useState('');
  const [substitutes, setSubstitutes] = useState<Record<string, string[]>>({});
  const [analysisMode, setAnalysisMode] = useState<'ingredients' | 'meal'>('ingredients');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const t = TRANSLATIONS[state.language];
  const isRtl = state.language === Language.AR;

  useEffect(() => {
    localStorage.setItem('visionchef_state_v2', JSON.stringify(state));
  }, [state]);

  const toggleLanguage = () => {
    setState(prev => ({ ...prev, language: prev.language === Language.AR ? Language.EN : Language.AR }));
  };

  const processInput = async (input: { base64?: string; text?: string }) => {
    setLoading(true);
    try {
      const results = await analyzeImageOrText(input, state.userProfile, state.language, analysisMode === 'meal');
      if (results.length > 1) {
        setRecipeChoices(results);
        setView('choices');
      } else {
        selectRecipe(results[0]);
      }
    } catch (err) {
      alert(isRtl ? 'عذراً، حدث خطأ. حاول مرة أخرى.' : 'Sorry, an error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const selectRecipe = (recipe: Recipe) => {
    setCurrentRecipe(recipe);
    setState(prev => ({ ...prev, history: [recipe, ...prev.history.slice(0, 19)] }));
    setView('recipe');
  };

  const handleImageInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => processInput({ base64: (reader.result as string).split(',')[1] });
      reader.readAsDataURL(file);
    }
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setState(prev => ({ ...prev, userProfile: { ...prev.userProfile, ...updates } }));
  };

  return (
    <div className={`min-h-screen flex flex-col ${isRtl ? 'rtl' : 'ltr'} bg-slate-50 font-cairo`}>
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-md border-b sticky top-0 z-50 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <span className="text-3xl">👨‍🍳</span>
          <h1 className="text-2xl font-black text-orange-600">{t.appName}</h1>
        </div>
        <button onClick={toggleLanguage} className="px-4 py-2 bg-slate-100 rounded-xl font-bold">{state.language === Language.AR ? 'English' : 'عربي'}</button>
      </header>

      <main className="flex-1 p-4 max-w-4xl mx-auto w-full pb-32">
        {loading && (
          <div className="fixed inset-0 bg-white/90 z-[100] flex flex-col items-center justify-center p-8 animate-fadeIn">
            <div className="w-16 h-16 border-4 border-orange-600 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-2xl font-black">{isRtl ? 'جاري التحضير...' : 'Cooking up ideas...'}</p>
          </div>
        )}

        {view === 'home' && (
          <div className="space-y-8 animate-fadeIn">
            <section className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100">
              <h2 className="text-3xl font-black mb-8 text-center">{t.tagline}</h2>
              
              {/* Manual Input */}
              <div className="mb-10 group">
                <label className="block mb-3 font-black text-slate-500 text-sm px-2">
                  {isRtl ? 'ماذا يوجد في مطبخك الآن؟ (اكتب المكونات هنا)' : 'What is in your kitchen? (Type here)'}
                </label>
                <div className="relative">
                  <textarea 
                    value={manualIngredients}
                    onChange={(e) => setManualIngredients(e.target.value)}
                    placeholder={isRtl ? "مثال: بيض، طماطم، بصل، فلفل..." : "Example: eggs, tomato, onion..."}
                    className="w-full p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 focus:border-orange-500 outline-none transition-all resize-none h-32 font-bold"
                  />
                  {manualIngredients.trim() && (
                    <button 
                      onClick={() => { setAnalysisMode('ingredients'); processInput({ text: manualIngredients }); }}
                      className="absolute bottom-4 left-4 right-4 bg-orange-600 text-white py-3 rounded-2xl font-black shadow-lg hover:bg-orange-700 transition"
                    >
                      {isRtl ? 'ابتكار وصفات من هذه المكونات' : 'Create recipes from these'}
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 mb-8">
                <div className="flex-1 h-px bg-slate-200"></div>
                <span className="text-slate-400 font-bold">{isRtl ? 'أو استخدم الكاميرا' : 'OR use Camera'}</span>
                <div className="flex-1 h-px bg-slate-200"></div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-6 bg-orange-50 rounded-3xl border border-orange-100 space-y-4">
                  <h3 className="font-black text-orange-800 text-center">{isRtl ? 'تصوير المكونات' : 'Scan Ingredients'}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => { setAnalysisMode('ingredients'); cameraInputRef.current?.click(); }} className="flex-1 bg-orange-600 text-white py-4 rounded-2xl flex items-center justify-center gap-2 font-black"><Icons.Camera /> {t.takePhoto}</button>
                    <button onClick={() => { setAnalysisMode('ingredients'); fileInputRef.current?.click(); }} className="p-4 bg-white text-orange-600 rounded-2xl border-2 border-orange-600"><Icons.Upload /></button>
                  </div>
                </div>
                <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100 space-y-4">
                  <h3 className="font-black text-blue-800 text-center">{isRtl ? 'تحليل وجبة جاهزة' : 'Analyze Ready Meal'}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => { setAnalysisMode('meal'); cameraInputRef.current?.click(); }} className="flex-1 bg-blue-600 text-white py-4 rounded-2xl flex items-center justify-center gap-2 font-black"><Icons.Camera /> {isRtl ? 'تصوير' : 'Scan'}</button>
                    <button onClick={() => { setAnalysisMode('meal'); fileInputRef.current?.click(); }} className="p-4 bg-white text-blue-600 rounded-2xl border-2 border-blue-600"><Icons.Upload /></button>
                  </div>
                </div>
              </div>
            </section>
            
            <input type="file" ref={cameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleImageInput} />
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageInput} />
          </div>
        )}

        {view === 'choices' && (
          <div className="space-y-8 animate-fadeIn">
            <h2 className="text-3xl font-black text-center">{isRtl ? 'اختر الوجبة التي تفضلها' : 'Choose your preferred meal'}</h2>
            <div className="grid gap-6">
              {recipeChoices.map((choice, i) => (
                <button 
                  key={i} 
                  onClick={() => selectRecipe(choice)}
                  className="bg-white p-8 rounded-[2.5rem] shadow-lg border-2 border-transparent hover:border-orange-500 transition-all text-right group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-orange-100 text-orange-600 px-4 py-1 rounded-full text-xs font-black">Option {i+1}</span>
                    <span className="text-slate-400 font-bold">⏱️ {choice.prepTime}</span>
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 mb-2 group-hover:text-orange-600">{choice.title}</h3>
                  <p className="text-slate-500 text-sm line-clamp-2">{choice.ingredients.join(' • ')}</p>
                </button>
              ))}
            </div>
            <button onClick={() => setView('home')} className="w-full py-4 text-slate-400 font-bold underline">{isRtl ? 'إلغاء والعودة' : 'Cancel and go back'}</button>
          </div>
        )}

        {view === 'profile' && (
          <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-xl space-y-10 animate-fadeIn border border-slate-100">
            <h2 className="text-3xl font-black border-b pb-6">{t.profile}</h2>
            
            <section className="space-y-4">
              <label className="block font-black text-lg text-slate-700">{isRtl ? 'المنطقة (المطبخ المفضل)' : 'Kitchen Region'}</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[Region.INTERNATIONAL, Region.GULF, Region.EGYPTIAN, Region.LEVANT, Region.MAGHREB].map(r => (
                  <button
                    key={r}
                    onClick={() => updateProfile({ region: r })}
                    className={`px-4 py-3 rounded-2xl border-2 font-bold transition-all ${state.userProfile.region === r ? 'bg-orange-600 text-white border-orange-700 shadow-md' : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-slate-200'}`}
                  >
                    {isRtl ? {
                      [Region.INTERNATIONAL]: 'عالمي',
                      [Region.GULF]: 'خليجي',
                      [Region.EGYPTIAN]: 'مصري',
                      [Region.LEVANT]: 'شامي',
                      [Region.MAGHREB]: 'مغربي'
                    }[r] : r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <label className="block font-black text-lg text-slate-700">{isRtl ? 'طريقة الحساب' : 'Calculation Mode'}</label>
              <div className="grid grid-cols-2 gap-4 p-2 bg-slate-50 rounded-2xl">
                <button onClick={() => updateProfile({ mode: 'free' })} className={`py-4 rounded-xl font-black ${state.userProfile.mode === 'free' ? 'bg-white shadow-md text-orange-600' : 'text-slate-400'}`}>{t.modeFree}</button>
                <button onClick={() => updateProfile({ mode: 'calculated' })} className={`py-4 rounded-xl font-black ${state.userProfile.mode === 'calculated' ? 'bg-white shadow-md text-orange-600' : 'text-slate-400'}`}>{t.modeCalculated}</button>
              </div>
            </section>

            {state.userProfile.mode === 'calculated' && (
              <section className="grid grid-cols-3 gap-4 p-6 bg-orange-50 rounded-3xl">
                <div className="space-y-2">
                  <label className="text-xs font-black text-orange-800">{t.age}</label>
                  <input type="number" value={state.userProfile.age || ''} onChange={e => updateProfile({ age: parseInt(e.target.value) || 0 })} className="w-full p-4 rounded-xl font-black text-center" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-orange-800">{t.weight}</label>
                  <input type="number" value={state.userProfile.weight || ''} onChange={e => updateProfile({ weight: parseInt(e.target.value) || 0 })} className="w-full p-4 rounded-xl font-black text-center" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-orange-800">{t.height}</label>
                  <input type="number" value={state.userProfile.height || ''} onChange={e => updateProfile({ height: parseInt(e.target.value) || 0 })} className="w-full p-4 rounded-xl font-black text-center" />
                </div>
              </section>
            )}

            <section className="space-y-4">
              <label className="block font-black text-lg text-slate-700">{t.diseases}</label>
              <div className="flex flex-wrap gap-2">
                {[Disease.DIABETES, Disease.HYPERTENSION, Disease.CELIAC].map(d => (
                  <button key={d} onClick={() => {
                    const next = state.userProfile.diseases.includes(d) ? state.userProfile.diseases.filter(x => x !== d) : [...state.userProfile.diseases, d];
                    updateProfile({ diseases: next });
                  }} className={`px-4 py-3 rounded-xl border-2 font-bold ${state.userProfile.diseases.includes(d) ? 'bg-red-500 text-white border-red-600 shadow-md' : 'bg-slate-50 border-slate-100'}`}>
                    {t[d as keyof typeof t] || d}
                  </button>
                ))}
              </div>
            </section>

            <button onClick={() => setView('home')} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xl shadow-lg">{t.save}</button>
          </div>
        )}

        {view === 'history' && (
          <div className="space-y-6 animate-fadeIn">
            <h2 className="text-3xl font-black">{t.history}</h2>
            {state.history.length === 0 ? (
              <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-bold">{isRtl ? 'السجل فارغ حالياً' : 'History is empty'}</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {state.history.map((h, i) => (
                  <button key={i} onClick={() => { setCurrentRecipe(h); setView('recipe'); }} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex justify-between items-center hover:shadow-md transition text-right">
                    <div>
                      <h4 className="font-black text-lg text-slate-800">{h.title}</h4>
                      <p className="text-xs text-slate-400">{new Date(h.timestamp).toLocaleDateString(isRtl ? 'ar-EG' : 'en-US')}</p>
                    </div>
                    <span className="text-orange-500 font-bold">🔥 {h.calories}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {view === 'recipe' && currentRecipe && (
          <div className="bg-white rounded-[3rem] overflow-hidden shadow-2xl animate-fadeIn border border-slate-50 pb-20">
            <div className={`p-10 text-white bg-gradient-to-br ${currentRecipe.isMealAnalysis ? 'from-blue-600 to-blue-400' : 'from-orange-600 to-orange-400'}`}>
              <button onClick={() => setView('home')} className="float-left bg-white/20 p-2 rounded-xl font-bold">✕</button>
              <h2 className="text-4xl font-black mb-4 clear-both">{currentRecipe.title}</h2>
              <div className="flex gap-4 font-bold text-sm">
                <span className="bg-white/20 px-4 py-2 rounded-xl">⏱️ {currentRecipe.prepTime}</span>
                {currentRecipe.calories && <span className="bg-white/20 px-4 py-2 rounded-xl">🔥 {currentRecipe.calories} kcal</span>}
              </div>
            </div>
            
            <div className="p-8 space-y-12">
              <section>
                <h3 className="text-2xl font-black mb-6 text-slate-800 border-r-4 border-orange-500 pr-4">{isRtl ? 'المكونات' : 'Ingredients'}</h3>
                <div className="grid gap-4">
                  {currentRecipe.ingredients.map((ing, i) => (
                    <div key={i} className="bg-slate-50 p-5 rounded-2xl flex justify-between items-center">
                      <span className="font-bold text-slate-700">{ing}</span>
                      {!currentRecipe.isMealAnalysis && (
                        <button 
                          onClick={async () => {
                            if (!substitutes[ing]) {
                              const subs = await getSubstitutes(ing, state.language);
                              setSubstitutes(prev => ({ ...prev, [ing]: subs }));
                            }
                          }}
                          className="text-xs font-black text-blue-600"
                        >
                          {t.substitutes}
                        </button>
                      )}
                      {substitutes[ing] && (
                        <div className="absolute mt-20 z-10 bg-white p-4 rounded-xl shadow-xl border border-blue-100 animate-fadeIn">
                          {substitutes[ing].map((s, idx) => <p key={idx} className="text-xs font-bold text-blue-800">💡 {s}</p>)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>

              <section>
                <h3 className="text-2xl font-black mb-6 text-slate-800 border-r-4 border-emerald-500 pr-4">{currentRecipe.isMealAnalysis ? (isRtl ? 'التقرير الصحي' : 'Health Report') : (isRtl ? 'طريقة التحضير' : 'Preparation')}</h3>
                <div className="space-y-6">
                  {currentRecipe.steps.map((step, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black flex-shrink-0">{i+1}</div>
                      <p className="font-bold text-slate-700 leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t px-8 py-4 flex justify-around shadow-lg rounded-t-[2.5rem] z-40">
        <button onClick={() => setView('home')} className={`p-2 transition-all ${view === 'home' ? 'text-orange-600 scale-125' : 'text-slate-400'}`}><Icons.Camera /></button>
        <button onClick={() => setView('history')} className={`p-2 transition-all ${view === 'history' ? 'text-orange-600 scale-125' : 'text-slate-400'}`}><Icons.History /></button>
        <button onClick={() => setView('profile')} className={`p-2 transition-all ${view === 'profile' ? 'text-orange-600 scale-125' : 'text-slate-400'}`}><Icons.User /></button>
      </nav>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
        .font-cairo { font-family: 'Cairo', sans-serif; }
      `}</style>
    </div>
  );
};

export default App;
