import React, { useMemo } from 'react';
import { GameState, Question, PlayerAnswer, Player } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Trophy, Timer, Users, ArrowRight, CheckCircle, XCircle, SkipForward, StopCircle } from 'lucide-react';
import { Button } from './Button';

interface HostViewProps {
  gameState: GameState;
  currentQuestion: Question | undefined;
  answers: PlayerAnswer[];
  players: Player[];
  timeLeft: number;
  onNext: () => void;
  onEndQuestion: () => void;
  onSkip: () => void; // New prop
  onShowLeaderboard: () => void;
  onStartQuiz: () => void;
  onStartCurrentQuestion: (customTime: number) => void;
  totalQuestions: number;
  currentQuestionIndex: number;
}

const COLORS = ['#ef4444', '#3b82f6', '#eab308', '#22c55e']; // Red, Blue, Yellow, Green
const SHAPES = ['▲', '●', '■', '◆'];

export const HostView: React.FC<HostViewProps> = ({
  gameState,
  currentQuestion,
  answers,
  players,
  timeLeft,
  onNext,
  onEndQuestion,
  onSkip,
  onShowLeaderboard,
  onStartQuiz,
  onStartCurrentQuestion,
  totalQuestions,
  currentQuestionIndex
}) => {
  const [customTime, setCustomTime] = React.useState<number>(30);

  // Sync custom time when question changes
  React.useEffect(() => {
    if (currentQuestion) setCustomTime(currentQuestion.timeLimit || 30);
  }, [currentQuestion]);

  const answerStats = useMemo(() => {
    if (!currentQuestion) return [];
    return currentQuestion.options.map((opt, idx) => ({
      name: opt.text.length > 15 ? opt.text.substring(0, 15) + '...' : opt.text,
      fullText: opt.text,
      count: answers.filter(a => a.optionId === opt.id && a.questionId === currentQuestion.id).length,
      isCorrect: opt.isCorrect,
      color: COLORS[idx % COLORS.length],
      shape: SHAPES[idx % SHAPES.length]
    }));
  }, [currentQuestion, answers]);

  const leaderboardData = useMemo(() => {
    return [...players]
      .sort((a, b) => b.score - a.score)
      .slice(0, 5); // Top 5
  }, [players]);

  if (gameState === GameState.LOBBY) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-8 bg-indigo-900 text-white p-8 rounded-xl shadow-2xl">
        <h1 className="text-5xl font-bold mb-4 animate-bounce">¡Listo para empezar!</h1>
        <div className="flex items-center gap-4 text-2xl">
          <Users size={32} />
          <span>{players.length} Estudiantes conectados</span>
        </div>
        <div className="bg-white/10 p-6 rounded-lg backdrop-blur-sm w-full max-w-md">
          <ul className="grid grid-cols-2 gap-2 text-lg">
            {players.map(p => <li key={p.id} className="truncate">{p.name}</li>)}
          </ul>
        </div>
        <Button onClick={onStartQuiz} size="lg" variant="success">Comenzar Quiz</Button>
      </div>
    );
  }

  if (gameState === GameState.LEADERBOARD) {
    return (
      <div className="flex flex-col items-center h-full bg-indigo-950 text-white p-6 rounded-xl">
        <h2 className="text-4xl font-bold mb-8 flex items-center gap-3">
          <Trophy className="text-yellow-400" size={48} />
          Marcador
        </h2>
        <div className="w-full max-w-3xl space-y-4">
          {leaderboardData.map((player, index) => (
            <div key={player.id} 
              className="flex items-center justify-between bg-white/10 p-4 rounded-lg transform transition-all duration-500 hover:scale-105"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center gap-4">
                <span className={`text-2xl font-bold w-12 h-12 flex items-center justify-center rounded-full ${index === 0 ? 'bg-yellow-400 text-black' : index === 1 ? 'bg-slate-300 text-black' : index === 2 ? 'bg-amber-600 text-black' : 'bg-transparent'}`}>
                  {index + 1}
                </span>
                <span className="text-2xl font-semibold">{player.name}</span>
                {player.streak > 2 && <span className="text-sm bg-orange-500 px-2 py-1 rounded-full">🔥 {player.streak}</span>}
              </div>
              <span className="text-2xl font-bold">{Math.round(player.score)} pts</span>
            </div>
          ))}
        </div>
        <div className="mt-auto pt-8">
           <Button onClick={onNext} size="lg" variant="primary">
             {currentQuestionIndex < totalQuestions - 1 ? 'Siguiente Pregunta' : 'Ver Resultados Finales'} <ArrowRight className="ml-2" />
           </Button>
        </div>
      </div>
    );
  }

  if (gameState === GameState.FINAL_RESULTS) {
      const winner = leaderboardData[0];
      return (
        <div className="flex flex-col items-center justify-center h-full bg-indigo-900 text-white p-8 rounded-xl text-center">
             <h1 className="text-6xl font-extrabold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-red-500">
               ¡Quiz Terminado!
             </h1>
             <div className="bg-white/10 p-12 rounded-2xl backdrop-blur-md mb-8">
                <Trophy size={120} className="text-yellow-400 mx-auto mb-4 animate-pulse" />
                <h2 className="text-4xl font-bold">{winner?.name || "Nadie"}</h2>
                <p className="text-2xl opacity-75">{Math.round(winner?.score || 0)} Puntos</p>
             </div>
             <Button onClick={() => window.location.reload()} variant="secondary">Crear Nuevo Quiz</Button>
        </div>
      )
  }

  if (gameState === GameState.PRE_QUESTION && currentQuestion) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-indigo-900 text-white p-8 rounded-xl shadow-2xl">
        <h2 className="text-2xl font-semibold mb-2 text-indigo-300">Siguiente Pregunta</h2>
        <h1 className="text-4xl md:text-5xl font-bold mb-12 text-center max-w-4xl leading-tight">
          {currentQuestion.text}
        </h1>
        
        <div className="bg-white/10 p-8 rounded-2xl backdrop-blur-md w-full max-w-md shadow-lg border border-white/20">
          <label className="block text-xl font-medium mb-4 text-center">Configurar Tiempo (segundos)</label>
          <div className="flex items-center justify-center gap-6 mb-8">
            <button 
              onClick={() => setCustomTime(prev => Math.max(10, prev - 5))}
              className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-3xl font-bold transition-all active:scale-95"
            >
              -
            </button>
            <span className="text-6xl font-black min-w-[120px] text-center">{customTime}</span>
            <button 
              onClick={() => setCustomTime(prev => Math.min(120, prev + 5))}
              className="w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-3xl font-bold transition-all active:scale-95"
            >
              +
            </button>
          </div>
          <Button onClick={() => onStartCurrentQuestion(customTime)} size="lg" variant="success" className="w-full text-xl py-4">
            Iniciar Pregunta
          </Button>
        </div>
      </div>
    );
  }

  // Question or Question Review Stats
  if (!currentQuestion) return null;

  return (
    <div className="flex flex-col h-full bg-slate-100 rounded-xl overflow-hidden relative">
      {/* Header */}
      <div className="bg-white p-4 shadow-sm flex justify-between items-center">
         <span className="font-bold text-slate-500">Pregunta {currentQuestionIndex + 1} de {totalQuestions}</span>
         {gameState === GameState.QUESTION_ACTIVE && (
             <div className="flex items-center gap-2 text-2xl font-bold text-indigo-600">
                <Timer className={timeLeft < 5 ? 'text-red-500 animate-pulse' : 'text-indigo-600'} />
                {timeLeft}s
             </div>
         )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 gap-8 overflow-y-auto">
         <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-800 max-w-4xl leading-tight">
           {currentQuestion.text}
         </h2>

         {gameState === GameState.QUESTION_ACTIVE ? (
            <div className="w-full max-w-4xl aspect-video bg-indigo-50 rounded-xl flex items-center justify-center border-2 border-indigo-100 border-dashed">
                <div className="text-center text-indigo-300">
                   <p className="text-xl font-bold">Esperando respuestas...</p>
                   <p className="text-4xl font-black mt-2">{answers.filter(a => a.questionId === currentQuestion.id).length}</p>
                   <p>Respuestas recibidas</p>
                </div>
            </div>
         ) : (
            <div className="w-full h-96 max-w-5xl">
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={answerStats} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
                   <XAxis 
                        dataKey="name" 
                        tick={{ fill: '#475569', fontSize: 14 }} 
                        axisLine={false}
                        tickLine={false}
                   />
                   <YAxis hide />
                   <Tooltip 
                     content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                                <div className="bg-white p-3 rounded shadow-lg border border-slate-200">
                                    <p className="font-bold">{data.fullText}</p>
                                    <p>{data.count} votos</p>
                                </div>
                            )
                        }
                        return null;
                     }}
                   />
                   <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                     {answerStats.map((entry, index) => (
                       <Cell 
                         key={`cell-${index}`} 
                         fill={entry.isCorrect ? '#22c55e' : '#cbd5e1'} 
                         opacity={entry.isCorrect ? 1 : 0.5}
                        />
                     ))}
                   </Bar>
                 </BarChart>
               </ResponsiveContainer>
            </div>
         )}

         {/* Answer Reveal Labels (Only in review) */}
         {gameState === GameState.QUESTION_REVIEW && (
             <div className="grid grid-cols-2 gap-4 w-full max-w-4xl">
                 {currentQuestion.options.map((opt, idx) => (
                     <div key={opt.id} className={`p-4 rounded-lg border-l-8 flex items-center gap-3 ${opt.isCorrect ? 'bg-green-50 border-green-500' : 'bg-slate-50 border-slate-300 opacity-60'}`}>
                         <span className="text-2xl font-bold" style={{color: COLORS[idx % COLORS.length]}}>{SHAPES[idx % SHAPES.length]}</span>
                         <span className="font-semibold text-lg">{opt.text}</span>
                         {opt.isCorrect && <CheckCircle className="ml-auto text-green-600" />}
                     </div>
                 ))}
             </div>
         )}
      </div>

      {/* Footer Controls */}
      <div className="bg-white p-4 border-t flex justify-between items-center">
          {gameState === GameState.QUESTION_ACTIVE && (
              <div className="flex gap-4 w-full justify-between">
                <Button onClick={onEndQuestion} variant="danger">
                   <StopCircle className="mr-2 w-5 h-5"/> Terminar Votación
                </Button>
                
                <Button onClick={onSkip} variant="secondary">
                   Siguiente Pregunta <SkipForward className="ml-2 w-5 h-5"/>
                </Button>
              </div>
          )}

          {gameState === GameState.QUESTION_REVIEW && (
            <div className="flex gap-4 ml-auto">
               <Button onClick={onShowLeaderboard} size="lg" variant="secondary">
                  Ver Marcador <Trophy className="ml-2 w-5 h-5"/>
               </Button>
               <Button onClick={onNext} size="lg" variant="primary">
                 {currentQuestionIndex < totalQuestions - 1 ? 'Siguiente Pregunta' : 'Resultados Finales'} <SkipForward className="ml-2 w-5 h-5"/>
               </Button>
            </div>
          )}
      </div>
    </div>
  );
};