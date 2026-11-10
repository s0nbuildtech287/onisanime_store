import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Loader2,
  AlertCircle
} from 'lucide-react';
import BrandLogo from './BrandLogo';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (username: string) => void;
  reasonMessage?: string;
}

const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  reasonMessage
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setUsername('');
      setPassword('');
      setError('');
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const u = username.trim().toLowerCase();
    const p = password;

    setTimeout(() => {
      if (u === 'xu4ns0n' && p === '123456') {
        localStorage.setItem('onisanime_session', 'true');
        localStorage.setItem('onisanime_user', 'xu4ns0n');
        onLoginSuccess('xu4ns0n');
        onClose();
      } else {
        setError('Tài khoản hoặc mật khẩu không chính xác!');
        setLoading(false);
      }
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fadeIn">
      <div className="relative w-full max-w-md rounded-3xl bg-[#0b0e1c] border border-white/15 shadow-2xl shadow-pink-500/20 p-6 sm:p-8 space-y-6">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
          title="Đóng"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Logo */}
        <div className="text-center space-y-2.5">
          <div className="flex justify-center">
            <BrandLogo className="w-14 h-14 rounded-2xl shadow-xl shadow-pink-500/30" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-300 text-[10px] font-extrabold">
            <ShieldCheck className="w-3.5 h-3.5" /> RESEARCH ACCESS ONLY
          </div>
          <h2 className="font-heading text-2xl font-black text-white">
            ĐĂNG NHẬP HỆ THỐNG
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {reasonMessage ||
              'Website phục vụ mục đích nghiên cứu kỹ thuật cá nhân. Vui lòng đăng nhập để mở trình phát Anime & trình đọc Manga.'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-bold">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              Tài khoản
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập..."
                autoFocus
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-900/90 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-300 block">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu..."
                className="w-full pl-10 pr-11 py-3 rounded-xl bg-slate-900/90 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-violet-600 hover:from-pink-400 hover:to-violet-500 text-white font-black text-sm shadow-xl shadow-pink-500/30 transition-all flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xác thực...</span>
              </>
            ) : (
              <>
                <span>ĐĂNG NHẬP NGAY</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="pt-2 border-t border-white/10 text-center">
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-slate-400 hover:text-slate-200 transition-colors"
          >
            Tiếp tục chế độ Xem Trải Nghiệm (Không phát video/truyện)
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;

