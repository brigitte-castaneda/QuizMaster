import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, QuizData, Player, PlayerAnswer, Question } from './types';
import { generateQuiz, generateQuizFromImages } from './services/geminiService';
import { convertPdfToImages } from './services/pdfUtils';
import { HostView } from './components/HostView';
import { StudentView } from './components/StudentView';
import { Button } from './components/Button';
import { Layout, Smartphone, Presentation, Upload, FileText, Sparkles } from 'lucide-react';

// Setup Mock Bots names
const BOT_NAMES = ['Ana', 'Carlos', 'Sofia', 'Miguel', 'Lucia'];

const App: React.FC = () => {
  // --- State ---
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(''); // Detailed loading message
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [setupMode, setSetupMode] = useState<'topic' | 'pdf'>('topic');
  
  const [gameState, setGameState] = useState<GameState>(GameState.SETUP);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  
  const [players, setPlayers] = useState<Player[]>([]);
  const [answers, setAnswers] = useState<PlayerAnswer[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string>('');

  // UI State for the demo
  const [activeTab, setActiveTab] = useState<'host' | 'student'>('host');

  // Refs for timers
  const timerRef = useRef<number | null>(null);
  const botTimersRef = useRef<number[]>([]);
  const answersRef = useRef(answers);

  // Keep answersRef synced for stale closure access in timers
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  // --- Actions ---

  const initGame = (data: QuizData) => {
    setQuizData(data);
    setGameState(GameState.LOBBY);
    
    // Initialize Players (User + Bots)
    const userId = 'user-' + Date.now();
    setMyPlayerId(userId);
    const newPlayers: Player[] = [
      { id: userId, name: '', score: 0, streak: 0, isBot: false }, // Empty name initially
      ...BOT_NAMES.map((name, i) => ({
         id: `bot-${i}`, name, score: 0, streak: 0, isBot: true
      }))
    ];
    setPlayers(newPlayers);
  };

  const handleCreateQuiz = async () => {
    if (!topic.trim()) return;
    setIsLoading(true);
    setLoadingStatus('Generando preguntas con IA...');
    try {
      const data = await generateQuiz(topic);
      initGame(data);
    } catch (e) {
      alert("Error al generar el quiz. Intenta de nuevo.");
      console.error(e);
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Por favor sube un archivo PDF válido.');
      return;
    }

    setIsLoading(true);
    setLoadingStatus('Leyendo PDF y procesando diapositivas...');

    try {
      // 1. Convert PDF to Images
      const images = await convertPdfToImages(file);
      
      if (images.length === 0) {
        throw new Error("No se pudieron extraer imágenes del PDF.");
      }

      setLoadingStatus(`Analizando ${images.length} diapositivas con IA...`);

      // 2. Send to Gemini
      const data = await generateQuizFromImages(images);
      
      // Override topic name with filename if needed or AI generated
      if (!data.topic) data.topic = file.name.replace('.pdf', '');
      
      initGame(data);

    } catch (e) {
      console.error(e);
      alert("Hubo un error al procesar el PDF. Asegúrate de que no esté protegido con contraseña.");
    } finally {
      setIsLoading(false);
      setLoadingStatus('');
    }
  };

  const handleRegister = (name: string, email: string) => {
    setPlayers(prev => prev.map(p => 
      p.id === myPlayerId ? { ...p, name, email } : p
    ));
    // Auto switch to student view on register if desired, or stay
  };

  const startQuiz = () => {
    setCurrentQuestionIndex(0);
    setGameState(GameState.PRE_QUESTION);
  };

  const activateQuestion = (customTime?: number) => {
    if (!quizData) return;
    const q = quizData.questions[currentQuestionIndex];
    
    // Allow overriding the AI generated time by updating the question in quizData
    if (customTime) {
       q.timeLimit = customTime;
       setQuizData({ ...quizData }); // Trigger re-render with new data
    }

    setGameState(GameState.QUESTION_ACTIVE);
    
    setTimeLeft(q.timeLimit || 30);
    setAnswers([]);
    
    // Clear previous timers
    if (timerRef.current) window.clearInterval(timerRef.current);
    botTimersRef.current.forEach(t => window.clearTimeout(t));
    botTimersRef.current = [];

    // Start Countdown
    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          endQuestion();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Schedule Bots to answer randomly
    simulateBotAnswers(q);
  };

  const simulateBotAnswers = (q: Question) => {
    const bots = players.filter(p => p.isBot);
    const limit = q.timeLimit || 30;
    
    bots.forEach(bot => {
      // Random delay between 2s and timeLimit - 2s
      const delay = 2000 + Math.random() * (limit * 1000 - 3000);
      
      const timerId = window.setTimeout(() => {
        // Simple logic: 70% chance to be correct
        const isCorrect = Math.random() > 0.3;
        const correctOpt = q.options.find(o => o.isCorrect);
        const wrongOpts = q.options.filter(o => !o.isCorrect);
        
        let selectedOpt = correctOpt;
        if (!isCorrect && wrongOpts.length > 0) {
           selectedOpt = wrongOpts[Math.floor(Math.random() * wrongOpts.length)];
        }

        if (selectedOpt) {
          registerAnswer(bot.id, selectedOpt.id, delay / 1000);
        }
      }, delay);
      botTimersRef.current.push(timerId);
    });
  };

  const registerAnswer = (playerId: string, optionId: string, timeTaken: number) => {
     setAnswers(prev => {
        // Prevent double answer
        if (prev.find(a => a.playerId === playerId)) return prev;

        // Use index from ID to avoid stale closure on currentQuestionIndex
        const qIdxParts = optionId.split('-');
        // Safety check if ID format matches our generator (qIdx-oIdx)
        if (qIdxParts.length < 2) return prev;
        
        const qIdx = parseInt(qIdxParts[0]);
        const question = quizData?.questions[qIdx];
        if (!question) return prev;

        const option = question.options.find(o => o.id === optionId);
        const isCorrect = option?.isCorrect || false;

        // Calculate Points: Base 1000 * accuracy * speed factor
        let points = 0;
        if (isCorrect) {
           const limit = question.timeLimit || 30;
           const speedRatio = 1 - (timeTaken / limit) / 2;
           points = Math.round(1000 * speedRatio);
        }

        return [...prev, { playerId, questionId: question.id, optionId, timeTaken, pointsAwarded: points }];
     });
  };

  const handleStudentAnswer = (optionId: string) => {
     if (!quizData) return;
     const q = quizData.questions[currentQuestionIndex];
     const limit = q.timeLimit || 30;
     const timeUsed = limit - timeLeft; // Approximate
     registerAnswer(myPlayerId, optionId, timeUsed);
  };

  // Helper to update scores based on current answers
  const updateScores = () => {
    setPlayers(currentPlayers => {
       return currentPlayers.map(p => {
          // Use Ref to get latest answers state
          const answer = answersRef.current.find(a => a.playerId === p.id);
          
          if (!answer) return { ...p, streak: 0 };
          
          return {
             ...p,
             score: p.score + answer.pointsAwarded,
             streak: answer.pointsAwarded > 0 ? p.streak + 1 : 0
          };
       });
    });
  };

  const endQuestion = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setGameState(GameState.QUESTION_REVIEW);
    updateScores();
  };

  const handleSkip = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    updateScores();
    handleNextQuestion();
  };

  const handleShowLeaderboard = () => {
     setGameState(GameState.LEADERBOARD);
  };

  const handleNextQuestion = () => {
     if (!quizData) return;
     if (currentQuestionIndex < quizData.questions.length - 1) {
        const nextIdx = currentQuestionIndex + 1;
        setCurrentQuestionIndex(nextIdx);
        setGameState(GameState.PRE_QUESTION);
     } else {
        setGameState(GameState.FINAL_RESULTS);
     }
  };

  // --- Render ---

  if (gameState === GameState.SETUP) {
     return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
              <div className="text-center mb-8">
                 <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-2">
                    QuizMaster AI
                 </h1>
                 <p className="text-slate-500">Crea cuestionarios interactivos en segundos.</p>
              </div>

              {/* Toggle Mode */}
              <div className="flex bg-slate-100 p-1 rounded-lg mb-6">
                 <button 
                   onClick={() => setSetupMode('topic')}
                   className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${setupMode === 'topic' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                   <Sparkles className="inline-block w-4 h-4 mr-2" />
                   Por Tema
                 </button>
                 <button 
                   onClick={() => setSetupMode('pdf')}
                   className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${setupMode === 'pdf' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                 >
                   <FileText className="inline-block w-4 h-4 mr-2" />
                   Subir PDF
                 </button>
              </div>
              
              <div className="space-y-4">
                 {setupMode === 'topic' ? (
                   <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Tema del Quiz</label>
                      <input 
                        type="text"
                        className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                        placeholder="Ej. Sistema Solar, Verbos en Inglés..."
                        value={topic}
                        onChange={(e) => setTopic(e.target.value)}
                        disabled={isLoading}
                      />
                      <Button 
                        className="w-full py-4 text-lg mt-4" 
                        onClick={handleCreateQuiz}
                        isLoading={isLoading}
                        disabled={!topic.trim()}
                      >
                        {isLoading ? 'Generando...' : 'Crear Quiz Mágico ✨'}
                      </Button>
                   </div>
                 ) : (
                   <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-indigo-400 transition-colors bg-slate-50 group">
                      <input 
                        type="file" 
                        accept="application/pdf"
                        onChange={handleFileUpload}
                        className="hidden" 
                        id="pdf-upload"
                        disabled={isLoading}
                      />
                      <label htmlFor="pdf-upload" className="cursor-pointer block">
                         <div className="bg-indigo-100 text-indigo-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                            <Upload size={32} />
                         </div>
                         <span className="block font-bold text-slate-700 text-lg">Sube tu PDF</span>
                         <span className="text-sm text-slate-500 mt-1 block">Cada página se convertirá en una pregunta</span>
                      </label>
                   </div>
                 )}

                 {isLoading && (
                   <div className="mt-4 text-center">
                      <div className="text-indigo-600 font-medium animate-pulse mb-2">{loadingStatus || 'Procesando...'}</div>
                      <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div className="bg-indigo-500 h-2 rounded-full animate-progress"></div>
                      </div>
                   </div>
                 )}
                 
                 <div className="bg-blue-50 text-blue-800 text-xs p-3 rounded-lg mt-4">
                    <strong>Nota:</strong> Se requiere una API Key de Google Gemini configurada.
                 </div>
              </div>
           </div>
        </div>
     );
  }

  const currentQuestion = quizData?.questions[currentQuestionIndex];
  const myAnswer = answers.find(a => a.playerId === myPlayerId);
  const me = players.find(p => p.id === myPlayerId) || players[0];

  return (
    <div className="h-screen flex flex-col bg-slate-200">
       {/* Top Bar for View Switching (Simulating 2 devices) */}
       <div className="bg-slate-900 text-white p-2 flex justify-center gap-4 shadow-md z-50">
          <button 
             onClick={() => setActiveTab('host')}
             className={`flex items-center gap-2 px-4 py-1 rounded transition-colors ${activeTab === 'host' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
             <Presentation size={18} /> Vista Profesor (Proyector)
          </button>
          <button 
             onClick={() => setActiveTab('student')}
             className={`flex items-center gap-2 px-4 py-1 rounded transition-colors ${activeTab === 'student' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
          >
             <Smartphone size={18} /> Vista Estudiante (Móvil)
          </button>
       </div>

       {/* Main Viewport */}
       <div className="flex-1 overflow-hidden relative">
          
          {/* Host View Layer */}
          <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'host' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'}`}>
             <div className="h-full max-w-6xl mx-auto p-4 md:p-8">
                <HostView 
                   gameState={gameState}
                   currentQuestion={currentQuestion}
                   answers={answers}
                   players={players}
                   timeLeft={timeLeft}
                   onNext={handleNextQuestion}
                   onEndQuestion={endQuestion}
                   onSkip={handleSkip}
                   onShowLeaderboard={handleShowLeaderboard}
                   onStartQuiz={startQuiz}
                   onStartCurrentQuestion={activateQuestion}
                   totalQuestions={quizData?.questions.length || 0}
                   currentQuestionIndex={currentQuestionIndex}
                />
             </div>
          </div>

          {/* Student View Layer (Simulated Phone) */}
          <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${activeTab === 'student' ? 'opacity-100 z-10 pointer-events-auto' : 'opacity-0 z-0 pointer-events-none'}`}>
             <div className="w-full h-full md:max-w-sm md:h-[800px] bg-white md:rounded-[3rem] md:border-8 md:border-slate-800 shadow-2xl overflow-hidden relative">
                {/* iPhone notch decoration */}
                <div className="hidden md:block absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-xl z-20"></div>
                
                <div className="h-full pt-8 md:pt-8"> {/* Padding for notch */}
                   <StudentView 
                      gameState={gameState}
                      currentQuestion={currentQuestion}
                      currentPlayer={me}
                      onAnswer={handleStudentAnswer}
                      onRegister={handleRegister}
                      myAnswer={myAnswer}
                   />
                </div>
             </div>
          </div>

       </div>
    </div>
  );
};

export default App;