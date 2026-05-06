import React, { useState } from 'react';
import { GameState, Question, PlayerAnswer, Player, Option } from '../types';
import { Button } from './Button';
import { CheckCircle, XCircle, Clock, AlertCircle, Mail, User, Timer } from 'lucide-react';

interface StudentViewProps {
  gameState: GameState;
  currentQuestion: Question | undefined;
  currentPlayer: Player;
  onAnswer: (optionId: string) => void;
  onRegister: (name: string, email: string) => void;
  myAnswer: PlayerAnswer | undefined;
}

const COLORS = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500'];
const SHAPES = ['▲', '●', '■', '◆'];

export const StudentView: React.FC<StudentViewProps> = ({
  gameState,
  currentQuestion,
  currentPlayer,
  onAnswer,
  onRegister,
  myAnswer
}) => {
  const [nameInput, setNameInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [error, setError] = useState('');

  // 1. Registration Screen
  if (!currentPlayer.email) {
    const handleJoin = () => {
      if (!nameInput.trim()) {
        setError('Por favor ingresa tu nombre.');
        return;
      }
      if (!emailInput.trim().endsWith('@uniandes.edu.co')) {
        setError('El correo debe terminar en @uniandes.edu.co');
        return;
      }
      onRegister(nameInput, emailInput);
    };

    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-100 p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm">
          <h2 className="text-2xl font-bold text-indigo-900 mb-6">Unirse al Quiz</h2>
          
          <div className="space-y-4">
            <div className="text-left">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre</label>
              <div className="relative">
                <User className="absolute left-3 top-3 text-slate-400" size={20} />
                <input 
                  type="text" 
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  placeholder="Tu nombre"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                />
              </div>
            </div>

            <div className="text-left">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Correo Uniandes</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-400" size={20} />
                <input 
                  type="email" 
                  className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 outline-none transition"
                  placeholder="usuario@uniandes.edu.co"
                  value={emailInput}
                  onChange={(e) => {
                    setEmailInput(e.target.value);
                    setError('');
                  }}
                />
              </div>
            </div>

            {error && (
              <div className="text-red-500 text-sm font-medium bg-red-50 p-2 rounded flex items-center gap-2">
                <AlertCircle size={16} /> {error}
              </div>
            )}

            <Button onClick={handleJoin} className="w-full mt-4" size="lg">
              Ingresar
            </Button>
          </div>
        </div>
      </div>
    );
  }
  
  // 2. Waiting Lobby
  if (gameState === GameState.LOBBY) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-100 p-6 text-center">
        <div className="animate-spin mb-6 text-indigo-600">
           <Clock size={48} />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">¡Ya estás dentro!</h2>
        <p className="text-slate-500 mt-2">¿Ves tu nombre en la pantalla del profesor?</p>
        <div className="mt-8 bg-white px-6 py-3 rounded-full shadow-sm font-mono font-bold text-xl text-indigo-600 border border-indigo-100">
          {currentPlayer.name}
        </div>
      </div>
    );
  }

  // Pre-Question wait state
  if (gameState === GameState.PRE_QUESTION) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-slate-100 p-6 text-center">
        <div className="animate-pulse mb-6 text-indigo-600">
           <Timer size={64} />
        </div>
        <h2 className="text-3xl font-bold text-slate-800 mb-2">¡Prepárate!</h2>
        <p className="text-xl text-slate-600">La siguiente pregunta está por comenzar...</p>
      </div>
    );
  }

  // 3. Leaderboard / Results
  if (gameState === GameState.LEADERBOARD || gameState === GameState.FINAL_RESULTS) {
      return (
          <div className="flex flex-col items-center justify-center h-full bg-indigo-600 text-white p-6">
              <h2 className="text-2xl font-bold mb-2">Puntuación Actual</h2>
              <div className="bg-white/20 px-8 py-4 rounded-xl text-4xl font-black mb-6">
                  {Math.round(currentPlayer.score)}
              </div>
              <p className="opacity-80">Mira la pantalla principal para ver el ranking.</p>
          </div>
      )
  }

  if (!currentQuestion) return null;

  // 4. Active Answering Phase
  if (gameState === GameState.QUESTION_ACTIVE) {
    if (myAnswer) {
      return (
        <div className="flex flex-col items-center justify-center h-full bg-slate-100 p-6">
          <h2 className="text-2xl font-bold text-slate-700 animate-pulse">¡Respuesta enviada!</h2>
          <p className="text-slate-500 mt-2">Espera a que termine el tiempo...</p>
        </div>
      );
    }

    // Changed to flex-col for horizontal bars layout
    return (
      <div className="flex flex-col gap-3 p-4 h-full bg-slate-100 overflow-y-auto">
        {currentQuestion.options.map((option, idx) => (
          <button
            key={option.id}
            onClick={() => onAnswer(option.id)}
            className={`${COLORS[idx % COLORS.length]} w-full rounded-xl shadow-md active:shadow-none active:translate-y-1 transition-all flex items-center justify-between text-white p-6 min-h-[5rem]`}
          >
            <div className="flex items-center gap-4 text-left">
               <span className="text-3xl font-black opacity-80">{SHAPES[idx % SHAPES.length]}</span>
               <span className="font-bold text-lg leading-tight">{option.text}</span>
            </div>
            {/* Optional arrow or indicator */}
          </button>
        ))}
      </div>
    );
  }

  // 5. Review Phase - Feedback
  if (gameState === GameState.QUESTION_REVIEW) {
    const selectedOption = currentQuestion.options.find(o => o.id === myAnswer?.optionId);
    const correctOption = currentQuestion.options.find(o => o.isCorrect);
    
    // Fallback if no answer was submitted
    if (!selectedOption) {
       return (
         <div className="flex flex-col items-center justify-center h-full bg-red-100 p-6 text-center">
            <Clock size={64} className="text-red-500 mb-4" />
            <h2 className="text-3xl font-bold text-red-700 mb-2">¡Se acabó el tiempo!</h2>
            <p className="text-slate-700">No respondiste a esta pregunta.</p>
         </div>
       )
    }

    const isCorrect = selectedOption.isCorrect;

    return (
      <div className={`flex flex-col h-full p-6 ${isCorrect ? 'bg-green-100' : 'bg-red-50'} overflow-y-auto`}>
        {/* Header Status */}
        <div className="text-center mb-8">
           {isCorrect ? (
             <>
               <CheckCircle size={80} className="text-green-500 mx-auto mb-2" />
               <h2 className="text-3xl font-black text-green-700">¡Correcto!</h2>
               <div className="inline-block bg-green-200 text-green-800 px-4 py-1 rounded-full font-bold mt-2">
                 +{Math.round(myAnswer.pointsAwarded)} Puntos
               </div>
             </>
           ) : (
             <>
               <XCircle size={80} className="text-red-500 mx-auto mb-2" />
               <h2 className="text-3xl font-black text-red-700">Incorrecto</h2>
               <p className="text-slate-600 font-medium mt-1">Tu racha se ha roto...</p>
             </>
           )}
        </div>

        {/* Personalized Feedback Card */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-start gap-3 mb-4">
             <AlertCircle className="text-indigo-600 flex-shrink-0 mt-1" />
             <h3 className="font-bold text-slate-800 text-lg">Retroalimentación Personalizada</h3>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Tu respuesta</p>
              <p className={`text-lg font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                {selectedOption.text}
              </p>
              {/* This is the unique feedback for what the student selected */}
              <p className="mt-2 text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100 text-sm">
                 {selectedOption.feedback}
              </p>
            </div>

            {!isCorrect && correctOption && (
               <div className="pt-4 border-t border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Respuesta Correcta</p>
                  <p className="text-lg font-semibold text-green-600">{correctOption.text}</p>
               </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
};