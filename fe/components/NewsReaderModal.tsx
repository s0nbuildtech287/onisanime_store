import React, { useEffect, useState } from 'react';
import {
  X,
  ExternalLink,
  Clock,
  Globe,
  Newspaper,
  Loader2,
  User
} from 'lucide-react';
import { NewsArticleItem, NewsContentBlock } from '../types';
import { newsApi } from '../services/otakuApi';

interface NewsReaderModalProps {
  article: NewsArticleItem | null;
  onClose: () => void;
}

const NewsReaderModal: React.FC<NewsReaderModalProps> = ({ article, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [sapo, setSapo] = useState('');
  const [blocks, setBlocks] = useState<NewsContentBlock[]>([]);

  useEffect(() => {
    if (!article) return;
    setLoading(true);
    setTitle(article.title);
    setSapo(article.summary);
    setBlocks([]);

    newsApi
      .getArticleDetail(article.link)
      .then((res) => {
        if (res.title) setTitle(res.title);
        if (res.sapo) setSapo(res.sapo);
        setBlocks(res.blocks || []);
      })
      .finally(() => setLoading(false));
  }, [article]);

  if (!article) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-5"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[92vh] bg-[#0b0e1a] border border-white/15 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Bar */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10 bg-[#0e1222]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={`px-2.5 py-1 rounded-lg text-[11px] font-black shrink-0 ${
                article.region === 'vn'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'bg-violet-500/20 text-violet-300 border border-violet-500/30'
              }`}
            >
              {article.region === 'vn' ? '🇻🇳 VN News' : '🌐 Global News'}
            </span>
            <span className="text-xs font-bold text-slate-300 truncate flex items-center gap-1.5">
              <Newspaper className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              {article.source}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Mở bài gốc</span>
            </a>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/30 text-slate-300 hover:text-white transition-all"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Article Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-8 py-6 space-y-6">
          <div className="space-y-3">
            <h1 className="text-xl sm:text-3xl font-black text-white leading-snug">
              {title || article.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                {article.publishedAt}
              </span>
              {article.author && (
                <span className="inline-flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-violet-400" />
                  {article.author}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-400" />
                {article.source}
              </span>
            </div>
          </div>

          {sapo && (
            <p className="text-sm sm:text-base font-bold text-slate-200 leading-relaxed bg-white/5 border-l-4 border-cyan-400 px-4 py-3 rounded-r-xl">
              {sapo}
            </p>
          )}

          {/* Hero image when no images parsed yet or loading */}
          {(loading || blocks.filter((b) => b.type === 'image').length === 0) &&
            article.imageUrl && (
              <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40">
                <img
                  src={article.imageUrl}
                  alt={article.title}
                  className="w-full max-h-[420px] object-cover mx-auto"
                />
              </div>
            )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
              <p className="text-xs font-bold">Đang cào nội dung đầy đủ từ báo gốc...</p>
            </div>
          ) : blocks.length > 0 ? (
            <div className="space-y-4">
              {blocks.map((block, idx) =>
                block.type === 'image' ? (
                  <figure
                    key={idx}
                    className="rounded-2xl overflow-hidden border border-white/10 bg-black/30 my-4"
                  >
                    <img
                      src={block.content}
                      alt={`Ảnh bài viết ${idx + 1}`}
                      loading="lazy"
                      className="w-full max-h-[520px] object-contain mx-auto"
                    />
                  </figure>
                ) : (
                  <p
                    key={idx}
                    className="text-sm sm:text-[15.5px] text-slate-200/95 leading-7"
                  >
                    {block.content}
                  </p>
                )
              )}
            </div>
          ) : (
            <div className="glass-panel rounded-2xl p-6 text-center space-y-4">
              <p className="text-sm text-slate-300 leading-relaxed">
                {article.summary ||
                  'Trang nguồn hiện giới hạn trích xuất trực tiếp. Anh bấm nút bên dưới để đọc đầy đủ bài gốc nhé!'}
              </p>
              <a
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs hover:brightness-110 transition-all"
              >
                <ExternalLink className="w-4 h-4" />
                Đọc bài viết gốc trên {article.source}
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewsReaderModal;

