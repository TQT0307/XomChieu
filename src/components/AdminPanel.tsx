import React, { useMemo, useState, useEffect } from 'react';
import { 
  FileText, FolderOpen, Users, Award, Trophy, Film, Settings, 
  Plus, Edit2, Trash2, Save, X, CheckCircle2, ShieldAlert,
  Shield, History, Key, LogOut, Lock, ShieldCheck, Swords,
  User, Eye, EyeOff, ClipboardList, Info, Check, UserCheck,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { 
  Category, Article, Member, Coach, Achievement, Tournament, Club, Highlight, WebConfig,
  AdminAccount, EditHistory, compareTournamentsByStatus, extractLegacyAchievementHonor
} from '../types';
import AdminItemDetailModal from './AdminItemDetailModal';
import RichTextEditor from './RichTextEditor';
import SmartSearchInput from './SmartSearchInput';
import defaultBanner1 from '../assets/images/banner1.jpg';
import defaultBanner2 from '../assets/images/banner2.jpg';
import defaultBanner3 from '../assets/images/banner3.jpg';
import defaultBanner4 from '../assets/images/banner4.jpg';
import defaultBanner5 from '../assets/images/banner5.jpg';
import { externalizeInlineImages } from '../mediaSync';
import {
  articleContentToPlainText,
  normalizeArticleContentForStorage,
} from '../utils/articleContent';
import { buildGoogleMapsEmbedUrl } from '../utils/googleMaps';
import { findPersonByIdOrName, formatPersonLookupValue } from '../utils/personLookup';
import {
  getHighQualityCropOutputSize,
  getRecommendedMaxZoom
} from '../utils/imageQuality';
import {
  DEFAULT_LATEST_NEWS_DAYS,
  MAX_LATEST_NEWS_DAYS,
  MIN_LATEST_NEWS_DAYS,
  normalizeLatestNewsDays
} from '../utils/latestNews';
import { matchesSmartSearch } from '../utils/smartSearch';
import { buildTournamentSearchOptions } from '../utils/tournamentSearchOptions';
import {
  parseStoredAdminAccount,
  parseStoredEditHistories
} from '../utils/adminStorage';
import { ADMIN_CONTENT_TABS } from '../utils/adminNavigation';

const adminBundledBannerImages: Record<string, string> = {
  '/src/assets/images/banner1.jpg': defaultBanner1,
  '/src/assets/images/banner2.jpg': defaultBanner2,
  '/src/assets/images/banner3.jpg': defaultBanner3,
  '/src/assets/images/banner4.jpg': defaultBanner4,
  '/src/assets/images/banner5.jpg': defaultBanner5,
};

const resolveAdminBannerImage = (image?: string) =>
  (image && adminBundledBannerImages[image]) || image || defaultBanner1;

const MAX_HIGHLIGHT_IMAGES = 50;
const MAX_SOURCE_IMAGE_BYTES = 15 * 1024 * 1024;
const TARGET_STORED_IMAGE_BYTES = 620 * 1024;
const HARD_STORED_IMAGE_BYTES = 650 * 1024;

const blobToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(new Error('Không thể đọc dữ liệu ảnh.'));
  reader.readAsDataURL(blob);
});

const loadBrowserImage = (url: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('Không thể mở ảnh đã chọn.'));
  image.src = url;
});

const canvasToWebpBlob = (canvas: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('Trình duyệt không thể nén ảnh này.')),
      'image/webp',
      quality
    );
  });

const resizeCanvas = (
  source: HTMLCanvasElement,
  scale: number
): HTMLCanvasElement => {
  const resized = document.createElement('canvas');
  resized.width = Math.max(1, Math.round(source.width * scale));
  resized.height = Math.max(1, Math.round(source.height * scale));
  const context = resized.getContext('2d');
  if (!context) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh.');
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(source, 0, 0, resized.width, resized.height);
  return resized;
};

const encodeCanvasForStorage = async (
  sourceCanvas: HTMLCanvasElement
): Promise<Blob> => {
  const qualities = [0.95, 0.92, 0.89, 0.86, 0.82, 0.78, 0.72];
  let workingCanvas = sourceCanvas;
  let smallestBlob: Blob | null = null;

  for (let resizePass = 0; resizePass < 7; resizePass += 1) {
    for (const quality of qualities) {
      const blob = await canvasToWebpBlob(workingCanvas, quality);
      if (!smallestBlob || blob.size < smallestBlob.size) smallestBlob = blob;
      if (blob.size <= TARGET_STORED_IMAGE_BYTES) return blob;
    }

    if (workingCanvas.width <= 640 || workingCanvas.height <= 360) break;
    workingCanvas = resizeCanvas(workingCanvas, 0.86);
  }

  if (!smallestBlob || smallestBlob.size > HARD_STORED_IMAGE_BYTES) {
    throw new Error('Ảnh quá phức tạp để lưu rõ nét dưới giới hạn 650 KB.');
  }
  return smallestBlob;
};

async function compressHighlightImage(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Chỉ được tải ảnh từ máy. Video hãy dùng đường dẫn URL/YouTube.');
  }
  if (file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error('Mỗi ảnh gốc tối đa 15 MB.');
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const source = await loadBrowserImage(objectUrl);
    const sourceLongestSide = Math.max(source.naturalWidth, source.naturalHeight);
    // Preserve more source pixels so the public gallery can zoom up to the
    // original resolution without CSS upscaling or visible stretching.
    const maxSides = [2200, 1920, 1600, 1280, 1024, 800, 640];
    const qualities = [0.94, 0.9, 0.86, 0.82, 0.78, 0.72, 0.66];
    let smallestBlob: Blob | null = null;
    let previousSize = '';

    for (const maxSide of maxSides) {
      const scale = Math.min(1, maxSide / sourceLongestSide);
      const width = Math.max(1, Math.round(source.naturalWidth * scale));
      const height = Math.max(1, Math.round(source.naturalHeight * scale));
      const sizeKey = `${width}x${height}`;
      if (sizeKey === previousSize) continue;
      previousSize = sizeKey;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh.');
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(source, 0, 0, width, height);

      for (const quality of qualities) {
        const blob = await canvasToWebpBlob(canvas, quality);
        if (!smallestBlob || blob.size < smallestBlob.size) smallestBlob = blob;
        if (blob.size <= TARGET_STORED_IMAGE_BYTES) {
          return blobToDataUrl(blob);
        }
      }
    }

    if (!smallestBlob || smallestBlob.size > HARD_STORED_IMAGE_BYTES) {
      throw new Error('Không thể nén ảnh xuống dưới 650 KB. Hãy chọn ảnh khác nhỏ hơn.');
    }
    return blobToDataUrl(smallestBlob);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function uploadHighlightImageDataUrl(dataUrl: string): Promise<string> {
  const response = await fetch('/api/media/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dataUrl })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || typeof result.url !== 'string') {
    throw new Error(result.error || result.message || 'Không thể lưu ảnh vào Firebase.');
  }
  return result.url;
}

async function compressAndUploadHighlightImage(file: File): Promise<string> {
  return uploadHighlightImageDataUrl(await compressHighlightImage(file));
}

interface AdminPanelProps {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  articles: Article[];
  setArticles: React.Dispatch<React.SetStateAction<Article[]>>;
  members: Member[];
  setMembers: React.Dispatch<React.SetStateAction<Member[]>>;
  coaches: Coach[];
  setCoaches: React.Dispatch<React.SetStateAction<Coach[]>>;
  achievements: Achievement[];
  setAchievements: React.Dispatch<React.SetStateAction<Achievement[]>>;
  tournaments: Tournament[];
  setTournaments: React.Dispatch<React.SetStateAction<Tournament[]>>;
  clubs: Club[];
  setClubs: React.Dispatch<React.SetStateAction<Club[]>>;
  highlights: Highlight[];
  setHighlights: React.Dispatch<React.SetStateAction<Highlight[]>>;
  webConfig: WebConfig;
  setWebConfig: React.Dispatch<React.SetStateAction<WebConfig>>;
  applyCloudSnapshot?: (data: any) => void;
  onBackToWebsite?: () => void;
}

type AdminTab = 
  | 'articles' 
  | 'categories' 
  | 'coaches' 
  | 'members' 
  | 'achievements' 
  | 'tournaments' 
  | 'clubs' 
  | 'highlights' 
  | 'webConfig'
  | 'admins'
  | 'history'
  | 'dbSync'
  | 'changePassword';

// Match the public desktop carousel proportions (reference viewport: 1440px).
// This makes object-position adjustments in admin line up with the live page.
const getBannerPreviewAspectClass = (height?: 'short' | 'medium' | 'large') =>
  height === 'short' ? 'aspect-[18/5]' :
  height === 'large' ? 'aspect-[72/31]' :
  'aspect-[72/25]';

type ImageEditorRatio = '1:1' | '16:9' | '4:3';

const IMAGE_EDITOR_PREVIEW_SIZE: Record<ImageEditorRatio, { width: number; height: number }> = {
  '1:1': { width: 280, height: 280 },
  '16:9': { width: 400, height: 225 },
  '4:3': { width: 360, height: 270 }
};

const clampNumber = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const getImageEditorGeometry = (
  ratio: ImageEditorRatio,
  zoom: number,
  rotation: number
) => {
  const frame = IMAGE_EDITOR_PREVIEW_SIZE[ratio];
  const isSwapped = Math.abs(rotation % 180) === 90;
  const rotatedBaseWidth = isSwapped ? frame.height : frame.width;
  const rotatedBaseHeight = isSwapped ? frame.width : frame.height;
  const rotationCoverScale = Math.max(
    frame.width / rotatedBaseWidth,
    frame.height / rotatedBaseHeight
  );
  const scale = rotationCoverScale * Math.max(1, zoom / 100);
  const renderedWidth = rotatedBaseWidth * scale;
  const renderedHeight = rotatedBaseHeight * scale;

  return {
    frame,
    scale,
    maxPanX: Math.max(0, (renderedWidth - frame.width) / 2),
    maxPanY: Math.max(0, (renderedHeight - frame.height) / 2)
  };
};

function ImageInput({ 
  label, 
  value, 
  onChange, 
  id,
  aspectRatio = '16:9'
}: { 
  label: string; 
  value: string; 
  onChange: (val: string) => void; 
  id: string;
  aspectRatio?: '1:1' | '16:9' | '4:3';
}) {
  const [mode, setMode] = useState<'url' | 'file'>('file');

  // Alignment workspace states
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [selectedRatio, setSelectedRatio] = useState<ImageEditorRatio>(aspectRatio);
  const [zoom, setZoom] = useState<number>(100);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [rotation, setRotation] = useState<number>(0);
  const [isCropMode, setIsCropMode] = useState(false);
  const [sourceDimensions, setSourceDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);

  // Sync aspect ratio when it changes from parent
  useEffect(() => {
    setSelectedRatio(aspectRatio);
  }, [aspectRatio]);

  useEffect(() => {
    if (!rawImage) {
      setSourceDimensions(null);
      return;
    }
    const source = new Image();
    source.onload = () => {
      setSourceDimensions({
        width: source.naturalWidth || source.width,
        height: source.naturalHeight || source.height
      });
    };
    source.onerror = () => setSourceDimensions(null);
    source.src = rawImage;
  }, [rawImage]);

  const qualityMaxZoom = sourceDimensions
    ? getRecommendedMaxZoom(
        sourceDimensions.width,
        sourceDimensions.height,
        selectedRatio,
        rotation
      )
    : 300;

  const clampPan = (
    nextPanX: number,
    nextPanY: number,
    nextZoom = zoom,
    nextRotation = rotation,
    nextRatio = selectedRatio
  ) => {
    const { maxPanX, maxPanY } = getImageEditorGeometry(nextRatio, nextZoom, nextRotation);
    return {
      x: Math.round(clampNumber(nextPanX, -maxPanX, maxPanX)),
      y: Math.round(clampNumber(nextPanY, -maxPanY, maxPanY))
    };
  };

  useEffect(() => {
    if (zoom <= qualityMaxZoom) return;
    setZoom(qualityMaxZoom);
    setPanX(0);
    setPanY(0);
  }, [qualityMaxZoom, zoom]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isCropMode) return;
    e.preventDefault();
    const startX = e.clientX;
    const startY = e.clientY;
    const initialPanX = panX;
    const initialPanY = panY;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      const nextPan = clampPan(initialPanX + deltaX, initialPanY + deltaY);
      setPanX(nextPan.x);
      setPanY(nextPan.y);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isCropMode) return;
    if (e.touches.length !== 1) return;
    const startX = e.touches[0].clientX;
    const startY = e.touches[0].clientY;
    const initialPanX = panX;
    const initialPanY = panY;

    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (moveEvent.touches.length !== 1) return;
      const deltaX = moveEvent.touches[0].clientX - startX;
      const deltaY = moveEvent.touches[0].clientY - startY;
      const nextPan = clampPan(initialPanX + deltaX, initialPanY + deltaY);
      setPanX(nextPan.x);
      setPanY(nextPan.y);
    };

    const handleTouchEnd = () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    document.addEventListener('touchmove', handleTouchMove);
    document.addEventListener('touchend', handleTouchEnd);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setRawImage(reader.result);
          // Reset alignment params for a new image
          setZoom(100);
          setPanX(0);
          setPanY(0);
          setRotation(0);
          setIsCropMode(false);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const cropImage = () => {
    if (!rawImage) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Export from the real source crop pixels, up to 1920px. Never enlarge
      // a small crop to a fake fixed size because that creates blur.
      const outputSize = getHighQualityCropOutputSize(
        img.naturalWidth || img.width,
        img.naturalHeight || img.height,
        selectedRatio,
        zoom,
        rotation
      );
      const targetWidth = outputSize.width;
      const targetHeight = outputSize.height;

      canvas.width = targetWidth;
      canvas.height = targetHeight;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetWidth, targetHeight);

      // Center
      ctx.translate(targetWidth / 2, targetHeight / 2);
      ctx.rotate((rotation * Math.PI) / 180);

      const scale = zoom / 100;
      
      const isSwapped = (rotation % 180 !== 0);
      const drawWidthImg = isSwapped ? img.height : img.width;
      const drawHeightImg = isSwapped ? img.width : img.height;

      const scaleX = targetWidth / drawWidthImg;
      const scaleY = targetHeight / drawHeightImg;
      const coverScale = Math.max(scaleX, scaleY);

      const finalWidth = img.width * coverScale * scale;
      const finalHeight = img.height * coverScale * scale;

      // Panning relative to high-resolution canvas size
      const previewWidth = selectedRatio === '1:1' ? 280 : 400;
      const scaleFactorX = targetWidth / previewWidth;
      const scaleFactorY = targetHeight / (previewWidth * (targetHeight / targetWidth));
      
      const rotationRadians = (rotation * Math.PI) / 180;
      const rotatedWidth =
        Math.abs(finalWidth * Math.cos(rotationRadians)) +
        Math.abs(finalHeight * Math.sin(rotationRadians));
      const rotatedHeight =
        Math.abs(finalWidth * Math.sin(rotationRadians)) +
        Math.abs(finalHeight * Math.cos(rotationRadians));
      const maxCanvasPanX = Math.max(0, (rotatedWidth - targetWidth) / 2);
      const maxCanvasPanY = Math.max(0, (rotatedHeight - targetHeight) / 2);
      const canvasPanX = clampNumber(
        panX * scaleFactorX,
        -maxCanvasPanX,
        maxCanvasPanX
      );
      const canvasPanY = clampNumber(
        panY * scaleFactorY,
        -maxCanvasPanY,
        maxCanvasPanY
      );

      ctx.drawImage(
        img,
        -finalWidth / 2 + canvasPanX,
        -finalHeight / 2 + canvasPanY,
        finalWidth,
        finalHeight
      );

      ctx.restore();

      try {
        const imageBlob = await encodeCanvasForStorage(canvas);
        onChange(await blobToDataUrl(imageBlob));
        setRawImage(null);
      } catch (err) {
        console.error("Canvas export failed:", err);
        if (rawImage.startsWith('http')) {
          // Fallback for external images blocked by CORS.
          onChange(rawImage);
          setRawImage(null);
          alert("Không thể cắt ảnh từ link ngoài do chính sách CORS. Link ảnh gốc đã được giữ nguyên.");
        } else {
          alert(err instanceof Error ? err.message : 'Không thể xuất ảnh chất lượng cao.');
        }
      }
    };
    img.onerror = () => {
      onChange(rawImage);
      setRawImage(null);
    };
    img.src = rawImage;
  };

  const previewGeometry = getImageEditorGeometry(selectedRatio, zoom, rotation);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-slate-500 uppercase">{label}</label>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setMode('file')}
            className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
              mode === 'file' ? 'bg-[#0054A6] text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            Từ máy
          </button>
          <button
            type="button"
            onClick={() => setMode('url')}
            className={`text-[10px] px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
              mode === 'url' ? 'bg-[#0054A6] text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            Nhập URL
          </button>
        </div>
      </div>
      
      {mode === 'file' ? (
        <div className="flex items-center gap-3">
          <input
            type="file"
            accept="image/*"
            id={id}
            onChange={handleFileChange}
            className="w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#0054A6] hover:file:bg-blue-100 cursor-pointer border p-1 rounded-lg bg-slate-50 flex-1"
          />
          {value && (
            <div className="flex items-center gap-1.5">
              <img src={value} alt="Preview" className="w-10 h-10 object-cover rounded-lg border flex-shrink-0" referrerPolicy="no-referrer" />
              <button
                type="button"
                onClick={() => {
                  setRawImage(value);
                  setZoom(100);
                  setPanX(0);
                  setPanY(0);
                  setRotation(0);
                  setIsCropMode(false);
                }}
                className="text-[10px] text-[#0054A6] hover:underline font-bold bg-blue-50 px-2 py-1.5 rounded-lg border border-blue-100 cursor-pointer"
              >
                Căn chỉnh
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <input
            type="text"
            id={id}
            value={value && !value.startsWith('data:') ? value : ''}
            onChange={e => onChange(e.target.value)}
            placeholder="Ví dụ: https://images.unsplash.com/photo..."
            className="w-full text-sm border p-2 rounded-lg focus:ring-2 focus:ring-[#0054A6] outline-none flex-1"
          />
          {value && (
            <div className="flex items-center gap-1.5">
              <img src={value} alt="Preview" className="w-10 h-10 object-cover rounded-lg border flex-shrink-0 text-xs" referrerPolicy="no-referrer" />
              <button
                type="button"
                onClick={() => {
                  setRawImage(value);
                  setZoom(100);
                  setPanX(0);
                  setPanY(0);
                  setRotation(0);
                  setIsCropMode(false);
                }}
                className="text-[10px] text-[#0054A6] hover:underline font-bold bg-blue-50 px-2 py-1.5 rounded-lg border border-blue-100 cursor-pointer"
              >
                Căn chỉnh
              </button>
            </div>
          )}
        </div>
      )}

      {/* Alignment & Cropping workspace modal */}
      {rawImage && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-slate-900 text-white rounded-3xl border border-white/10 w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-slate-950">
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider text-[#FFF200]">Bộ công cụ căn chỉnh & cắt khung hình</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Cân chỉnh ảnh chuẩn xác để hiển thị đẹp nhất trên trang người dùng</p>
              </div>
              <button
                type="button"
                onClick={() => setRawImage(null)}
                className="p-1.5 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-slate-900">
              {/* Left Side: Live Preview Area */}
              <div className="flex flex-col items-center justify-center space-y-3">
                <span className="text-[10px] uppercase font-black tracking-widest text-[#FFF200] bg-[#FFF200]/10 border border-[#FFF200]/20 px-2.5 py-1 rounded-full">
                  {isCropMode
                    ? `BƯỚC 2: CĂN CHỈNH KHUNG ${selectedRatio}`
                    : 'BƯỚC 1: XEM TOÀN BỘ ẢNH GỐC'}
                </span>
                
                {/* Visual crop frame wrapper */}
                <div className="bg-slate-950 p-4 rounded-2xl border border-white/5 w-full flex items-center justify-center min-h-[340px]">
                  <div 
                    onMouseDown={handleMouseDown}
                    onTouchStart={handleTouchStart}
                    className={`relative overflow-hidden border-2 border-dashed border-[#FFF200]/50 shadow-2xl bg-slate-900 select-none ${
                      isCropMode ? 'cursor-move' : 'cursor-default'
                    } ${
                      selectedRatio === '16:9' ? 'aspect-video w-full max-w-[400px]' :
                      selectedRatio === '4:3' ? 'aspect-[4/3] w-full max-w-[360px]' :
                      'aspect-square w-full max-w-[280px] rounded-2xl'
                    }`}
                    title={isCropMode ? 'Kéo thả trực tiếp để di chuyển ảnh vừa khung' : 'Xem đầy đủ ảnh gốc'}
                  >
                    <img
                      src={rawImage}
                      alt="Crop target"
                      referrerPolicy="no-referrer"
                      className={`absolute origin-center pointer-events-none transition-none select-none ${
                        isCropMode ? 'max-w-none' : 'inset-0 max-h-full max-w-full'
                      }`}
                      style={isCropMode ? {
                        top: '50%',
                        left: '50%',
                        transform: `translate(calc(-50% + ${panX}px), calc(-50% + ${panY}px)) scale(${previewGeometry.scale}) rotate(${rotation}deg)`,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      } : {
                        width: '100%',
                        height: '100%',
                        objectFit: 'contain'
                      }}
                    />
                    
                    {/* Visual Guideline Grid Overlay */}
                    <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20">
                      <div className="border-r border-b border-white"></div>
                      <div className="border-r border-b border-white"></div>
                      <div className="border-b border-white"></div>
                      <div className="border-r border-b border-white"></div>
                      <div className="border-r border-b border-white"></div>
                      <div className="border-b border-white"></div>
                      <div className="border-r border-white"></div>
                      <div className="border-r border-white"></div>
                      <div></div>
                    </div>
                  </div>
                </div>
                <p className="text-[10px] text-[#FFF200]/90 italic text-center font-bold">
                  {isCropMode
                    ? '💡 MẸO: Nhấn giữ và KÉO THẢ chuột/tay trực tiếp lên ảnh để di chuyển vừa khung hình'
                    : 'Ảnh đang được hiển thị đầy đủ, chưa cắt mất phần nào.'}
                </p>
                <p className="text-[9px] text-slate-500 italic text-center">
                  {isCropMode
                    ? 'Ảnh được khóa phủ kín khung để giao diện người dùng không xuất hiện khoảng trống.'
                    : 'Sau khi kiểm tra ảnh gốc, bấm “Bắt đầu căn chỉnh” để phóng to và chọn vùng hiển thị phù hợp.'}
                </p>
              </div>

              {/* Right Side: Controllers */}
              <div className="space-y-5 bg-slate-950/40 p-5 rounded-2xl border border-white/5">
                <div className="rounded-2xl border border-[#FFF200]/20 bg-[#FFF200]/5 p-4">
                  <p className="text-[10px] font-black uppercase tracking-wider text-[#FFF200]">
                    {isCropMode ? 'Đang căn chỉnh ảnh theo khung đã chọn' : 'Kiểm tra toàn bộ ảnh gốc trước khi cắt'}
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsCropMode(current => !current)}
                    className="mt-3 w-full rounded-xl bg-[#0054A6] px-4 py-2.5 text-xs font-black uppercase text-white transition-colors hover:bg-blue-700"
                  >
                    {isCropMode ? 'Xem lại toàn bộ ảnh gốc' : 'Bắt đầu căn chỉnh'}
                  </button>
                </div>

                <div className={`space-y-5 transition-opacity ${isCropMode ? '' : 'pointer-events-none opacity-35'}`}>
                {/* Ratio Selection */}
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">1. Chọn tỉ lệ khung hình</span>
                  <div className="grid grid-cols-3 gap-2">
                    {(['16:9', '4:3', '1:1'] as const).map(ratio => (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => {
                          setSelectedRatio(ratio);
                          setPanX(0);
                          setPanY(0);
                        }}
                        className={`text-xs py-2 px-1.5 rounded-xl font-bold border transition-all cursor-pointer ${
                          selectedRatio === ratio
                            ? 'bg-[#0054A6] text-white border-[#0054A6] shadow-md shadow-[#0054A6]/20'
                            : 'bg-slate-800 text-slate-300 border-white/5 hover:bg-slate-700'
                        }`}
                      >
                        {ratio === '16:9' ? '16:9 (Bài viết/CLB/Thành tích)' : ratio === '4:3' ? '4:3 (Ảnh truyền thống)' : '1:1 (HLV/Môn sinh)'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Zoom Controller */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">2. Thu phóng (Zoom: {zoom}%)</span>
                    <button
                      type="button"
                      onClick={() => {
                        setZoom(100);
                        setPanX(0);
                        setPanY(0);
                      }}
                      className="text-[9px] font-black text-[#FFF200] uppercase hover:underline"
                    >
                      Mặc định
                    </button>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max={qualityMaxZoom}
                    value={zoom}
                    onChange={e => {
                      const nextZoom = Math.max(100, parseInt(e.target.value));
                      const nextPan = clampPan(panX, panY, nextZoom);
                      setZoom(nextZoom);
                      setPanX(nextPan.x);
                      setPanY(nextPan.y);
                    }}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#FFF200]"
                  />
                  {sourceDimensions && (
                    <div className={`mt-2 rounded-lg border px-2.5 py-2 text-[9px] font-semibold leading-relaxed ${
                      qualityMaxZoom <= 100
                        ? 'border-amber-400/30 bg-amber-400/10 text-amber-200'
                        : 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200'
                    }`}>
                      Ảnh gốc: {sourceDimensions.width}×{sourceDimensions.height}px
                      {' • '}Zoom rõ nét tối đa: {qualityMaxZoom}%
                      {qualityMaxZoom <= 100 && (
                        <span className="block mt-0.5 text-amber-300">
                          Ảnh nguồn chưa đủ lớn để phóng thêm mà vẫn giữ độ nét.
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Pan X Controller */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">3. Dịch Ngang (Trái - Phải: {panX}px)</span>
                    <button
                      type="button"
                      onClick={() => setPanX(0)}
                      className="text-[9px] font-black text-[#FFF200] uppercase hover:underline"
                    >
                      Giữa
                    </button>
                  </div>
                  <input
                    type="range"
                    min={-Math.ceil(previewGeometry.maxPanX)}
                    max={Math.ceil(previewGeometry.maxPanX)}
                    value={panX}
                    onChange={e => {
                      const nextPan = clampPan(parseInt(e.target.value), panY);
                      setPanX(nextPan.x);
                      setPanY(nextPan.y);
                    }}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Pan Y Controller */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">4. Dịch Dọc (Lên - Xuống: {panY}px)</span>
                    <button
                      type="button"
                      onClick={() => setPanY(0)}
                      className="text-[9px] font-black text-[#FFF200] uppercase hover:underline"
                    >
                      Giữa
                    </button>
                  </div>
                  <input
                    type="range"
                    min={-Math.ceil(previewGeometry.maxPanY)}
                    max={Math.ceil(previewGeometry.maxPanY)}
                    value={panY}
                    onChange={e => {
                      const nextPan = clampPan(panX, parseInt(e.target.value));
                      setPanX(nextPan.x);
                      setPanY(nextPan.y);
                    }}
                    className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>

                {/* Rotation and Helpers */}
                <div>
                  <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">5. Xoay góc ảnh</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRotation(prev => (prev - 90 + 360) % 360);
                        setPanX(0);
                        setPanY(0);
                      }}
                      className="text-xs bg-slate-800 text-slate-300 hover:bg-slate-700 py-1.5 px-3 rounded-lg border border-white/5 font-semibold flex-1 cursor-pointer"
                    >
                      ↺ Xoay trái 90°
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRotation(prev => (prev + 90) % 360);
                        setPanX(0);
                        setPanY(0);
                      }}
                      className="text-xs bg-slate-800 text-slate-300 hover:bg-slate-700 py-1.5 px-3 rounded-lg border border-white/5 font-semibold flex-1 cursor-pointer"
                    >
                      ↻ Xoay phải 90°
                    </button>
                  </div>
                </div>

                {/* Global Reset */}
                <div className="pt-2 border-t border-white/5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setZoom(100);
                      setPanX(0);
                      setPanY(0);
                      setRotation(0);
                    }}
                    className="text-xs bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 py-2 px-4 rounded-xl font-bold cursor-pointer w-full border border-white/5 transition-all"
                  >
                    Reset về mặc định
                  </button>
                </div>
                </div>
              </div>
            </div>

            {/* Modal Footer actions */}
            <div className="p-5 border-t border-white/10 bg-slate-950 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRawImage(null)}
                className="text-xs bg-slate-800 text-slate-300 hover:bg-slate-700 px-5 py-2.5 rounded-xl font-bold cursor-pointer transition-all border border-white/5"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => {
                  if (isCropMode) {
                    cropImage();
                  } else {
                    setIsCropMode(true);
                  }
                }}
                className="text-xs bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-xl font-black cursor-pointer shadow-lg shadow-emerald-900/20 transition-all flex items-center gap-1.5 uppercase"
              >
                <Check className="w-4 h-4" />
                {isCropMode ? 'Xác nhận cắt & lưu' : 'Tiếp tục căn chỉnh'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPanel({
  categories, setCategories,
  articles, setArticles,
  members, setMembers,
  coaches, setCoaches,
  achievements, setAchievements,
  tournaments, setTournaments,
  clubs, setClubs,
  highlights, setHighlights,
  webConfig, setWebConfig,
  applyCloudSnapshot,
  onBackToWebsite
}: AdminPanelProps) {

  // Releases before V34 stored only the boolean flag. Assign a real promotion
  // timestamp and the default duration once, without changing newer articles.
  useEffect(() => {
    if (!articles.some(article =>
      article.showInNews && (!article.featuredAt || article.featuredDays === undefined)
    )) return;
    const promotedAt = new Date().toISOString();
    setArticles(current => current.map(article =>
      article.showInNews && (!article.featuredAt || article.featuredDays === undefined)
        ? {
            ...article,
            featuredAt: article.featuredAt || promotedAt,
            featuredDays: normalizeLatestNewsDays(article.featuredDays)
          }
        : article
    ));
  }, [articles, setArticles]);
  
  // Custom Toasts and Deletion Confirms
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ tab: AdminTab; id: string | number; name: string } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    const handleSyncError = (event: Event) => {
      const detail = (event as CustomEvent<{
        key?: string;
        message?: string;
        retrying?: boolean;
        retryCount?: number;
      }>).detail;
      showToast(
        detail?.retrying
          ? `Kết nối tạm thời gián đoạn. Hệ thống đang tự lưu lại ${detail?.key || 'dữ liệu'} (lần ${detail.retryCount || 1}/5).`
          : detail?.message || `Không thể lưu ${detail?.key || 'dữ liệu'} lên Firebase. Vui lòng thử lại!`,
        detail?.retrying ? 'info' : 'error'
      );
    };
    const handleMergedSyncSuccess = (event: Event) => {
      const detail = (event as CustomEvent<{ conflictResolved?: boolean }>).detail;
      if (detail?.conflictResolved) {
        showToast(
          'Dữ liệu mới nhất đã được tự động hợp nhất và lưu thành công.',
          'success'
        );
      }
    };
    window.addEventListener('vovinam-sync-error', handleSyncError);
    window.addEventListener('vovinam-sync-success', handleMergedSyncSuccess);
    return () => {
      window.removeEventListener('vovinam-sync-error', handleSyncError);
      window.removeEventListener('vovinam-sync-success', handleMergedSyncSuccess);
    };
  }, []);

  // Account credentials are kept only in the private server database. The
  // browser receives safe account metadata after a Super Admin signs in.
  const [adminAccounts, setAdminAccounts] = useState<AdminAccount[]>([]);

  useEffect(() => {
    // Remove credentials cached by releases older than the secure Admin API.
    localStorage.removeItem('vovinam_admin_accounts');
    localStorage.removeItem('vovinam_remembered_password');
    ([localStorage, sessionStorage] as Storage[]).forEach(storage => {
      const raw = storage.getItem('vovinam_current_admin');
      if (!raw) return;
      const safeAccount = parseStoredAdminAccount(raw);
      if (safeAccount) {
        storage.setItem('vovinam_current_admin', JSON.stringify(safeAccount));
      } else {
        storage.removeItem('vovinam_current_admin');
      }
    });
    setCurrentAdmin(current => {
      if (!current) return current;
      const { password: _legacyPassword, ...safeAccount } = current;
      return safeAccount;
    });
  }, []);

  // Initialize System Action Logs state from localStorage
  const [editHistories, setEditHistories] = useState<EditHistory[]>(() => {
    const saved = parseStoredEditHistories(
      localStorage.getItem('vovinam_edit_histories')
    );
    if (saved) return saved;
    const seedLogs: EditHistory[] = [
      {
        id: 1,
        timestamp: new Date().toISOString(),
        username: 'system',
        role: 'super',
        action: 'Khởi tạo',
        tab: 'system',
        details: 'Hệ thống quản trị câu lạc bộ Vovinam khởi tạo thành công.'
      }
    ];
    localStorage.setItem('vovinam_edit_histories', JSON.stringify(seedLogs));
    return seedLogs;
  });

  // Current logged in Admin state
  const [currentAdmin, setCurrentAdmin] = useState<AdminAccount | null>(() => {
    // Check local storage (Remember me) or session storage
    return parseStoredAdminAccount(
      localStorage.getItem('vovinam_current_admin')
    ) || parseStoredAdminAccount(
      sessionStorage.getItem('vovinam_current_admin')
    );
  });

  // Authentication UI state
  const [loginUsername, setLoginUsername] = useState(() => {
    return localStorage.getItem('vovinam_remembered_username') || '';
  });
  const [loginPassword, setLoginPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(() => {
    return localStorage.getItem('vovinam_remember_me_checked') === 'true';
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    if (!currentAdmin) return;
    let active = true;
    fetch('/api/admin-session', { cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('Admin session expired');
        return response.json();
      })
      .then(payload => {
        if (!active || !payload?.session) return;
        const safeAccount = parseStoredAdminAccount(
          JSON.stringify(payload.session)
        );
        if (!safeAccount) throw new Error('Invalid Admin session');
        setCurrentAdmin(safeAccount);
        if (payload.session.remember === true || rememberMe) {
          localStorage.setItem('vovinam_current_admin', JSON.stringify(safeAccount));
          sessionStorage.removeItem('vovinam_current_admin');
        } else {
          sessionStorage.setItem('vovinam_current_admin', JSON.stringify(safeAccount));
          localStorage.removeItem('vovinam_current_admin');
        }
      })
      .catch(() => {
        if (!active) return;
        setCurrentAdmin(null);
        localStorage.removeItem('vovinam_current_admin');
        sessionStorage.removeItem('vovinam_current_admin');
      });
    return () => { active = false; };
  }, [currentAdmin?.id]);

  // Tab & Filter states
  const [activeTab, setActiveTab] = useState<AdminTab>('articles');
  const [searchQuery, setSearchQuery] = useState('');

  // Editing & adding states
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | number | null>(null);
  const [typedClubCoachId, setTypedClubCoachId] = useState<string>('');
  const [typedHighlightAthleteId, setTypedHighlightAthleteId] = useState<string>('');

  // Form states for general models
  const [articleForm, setArticleForm] = useState<Partial<Article>>({});
  const [categoryForm, setCategoryForm] = useState<Partial<Category>>({});
  const [coachForm, setCoachForm] = useState<Partial<Coach>>({});
  const [memberForm, setMemberForm] = useState<Partial<Member>>({});
  const [achievementForm, setAchievementForm] = useState<Partial<Achievement>>({});
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [tournamentForm, setTournamentForm] = useState<Partial<Tournament>>({});
  const [clubForm, setClubForm] = useState<Partial<Club>>({});
  const [highlightForm, setHighlightForm] = useState<Partial<Highlight>>({ mediaUrls: [], mediaNotes: [] });
  const [isUploadingHighlightMedia, setIsUploadingHighlightMedia] = useState(false);
  const [highlightUploadProgress, setHighlightUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [webConfigForm, setWebConfigForm] = useState<WebConfig>(webConfig);
  const savedAchievementTournamentNames = useMemo(() => Array.from(new Set(
    [
      ...achievements.map(achievement => achievement.tournamentName?.trim() ||
        (achievement.tournamentId ? tournaments.find(t => t.id === achievement.tournamentId)?.name?.trim() : '')),
      ...tournaments.map(tournament => tournament.name?.trim()),
      ...highlights.map(highlight => highlight.tournamentName?.trim() ||
        (highlight.tournamentId ? tournaments.find(t => t.id === highlight.tournamentId)?.name?.trim() : ''))
    ].filter((name): name is string => Boolean(name))
  )).sort((a, b) => a.localeCompare(b, 'vi')), [achievements, highlights, tournaments]);

  const handleHighlightImageUpload = async (files: File[], replaceIndex?: number) => {
    if (isUploadingHighlightMedia || files.length === 0) return;

    const selectedFiles = replaceIndex === undefined ? files : files.slice(0, 1);
    const existingImageCount = (highlightForm.mediaUrls || []).filter(url => url.trim() !== '').length;
    if (replaceIndex === undefined && existingImageCount + selectedFiles.length > MAX_HIGHLIGHT_IMAGES) {
      showToast(`Mỗi Highlight được lưu tối đa ${MAX_HIGHLIGHT_IMAGES} ảnh.`, 'error');
      return;
    }

    setIsUploadingHighlightMedia(true);
    setHighlightUploadProgress({ current: 0, total: selectedFiles.length });
    let uploadedCount = 0;

    try {
      for (let index = 0; index < selectedFiles.length; index += 1) {
        const uploadedUrl = await compressAndUploadHighlightImage(selectedFiles[index]);
        uploadedCount += 1;
        setHighlightUploadProgress({ current: index + 1, total: selectedFiles.length });

        setHighlightForm(previous => {
          if (replaceIndex !== undefined) {
            const urls = [...(previous.mediaUrls || [])];
            const notes = [...(previous.mediaNotes || [])];
            while (urls.length <= replaceIndex) urls.push('');
            while (notes.length <= replaceIndex) notes.push('');
            urls[replaceIndex] = uploadedUrl;
            return { ...previous, mediaUrls: urls, mediaNotes: notes };
          }

          const existingPairs = (previous.mediaUrls || [])
            .map((url, mediaIndex) => ({
              url,
              note: previous.mediaNotes?.[mediaIndex] || ''
            }))
            .filter(item => item.url.trim() !== '');
          return {
            ...previous,
            mediaUrls: [...existingPairs.map(item => item.url), uploadedUrl],
            mediaNotes: [...existingPairs.map(item => item.note), '']
          };
        });
      }
      showToast(`Đã nén và lưu ${uploadedCount} ảnh vào Firebase.`, 'success');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Không thể tải ảnh lên Firebase.', 'error');
    } finally {
      setIsUploadingHighlightMedia(false);
      setHighlightUploadProgress(null);
    }
  };

  // Sync webConfig from props
  useEffect(() => {
    setWebConfigForm(webConfig);
  }, [webConfig]);

  // Banner editor states
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [bannerForm, setBannerForm] = useState({
    id: '',
    image: '',
    title: '',
    subtitle: '',
    alignmentPct: 50
  });
  const [isAddingBanner, setIsAddingBanner] = useState(false);
  const [previewBannerIndex, setPreviewBannerIndex] = useState(0);
  const [isDraggingY, setIsDraggingY] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [dragStartPct, setDragStartPct] = useState(50);

  // Admin Account Form States
  const [adminForm, setAdminForm] = useState<Partial<AdminAccount>>({
    username: '',
    password: '',
    name: '',
    role: 'assistant',
    permissions: ['articles']
  });
  const [isEditingAdmin, setIsEditingAdmin] = useState(false);
  const [editAdminId, setEditAdminId] = useState<string | null>(null);

  // Password Change Form States
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // State to view details of any selected CRUD item
  const [viewDetailItem, setViewDetailItem] = useState<{ tab: AdminTab; data: any } | null>(null);

  // Sync activeTab permissions for Assistant Admin
  useEffect(() => {
    if (currentAdmin) {
      if (currentAdmin.role === 'assistant') {
        const isAllowed = currentAdmin.permissions.includes(activeTab) || activeTab === 'changePassword';
        if (!isAllowed) {
          const firstAllowed = currentAdmin.permissions[0] as AdminTab || 'changePassword';
          setActiveTab(firstAllowed);
        }
      }
    }
  }, [activeTab, currentAdmin]);

  // Only the Super Admin can load account metadata. Passwords and hashes never
  // leave the private server API.
  useEffect(() => {
    if (!currentAdmin || currentAdmin.role !== 'super') return;
    let active = true;
    fetch('/api/admin-accounts', { cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('Cannot load shared admin accounts');
        return response.json();
      })
      .then(payload => {
        if (!active) return;
        const cloudAccounts = Array.isArray(payload.accounts) ? payload.accounts as AdminAccount[] : [];
        setAdminAccounts(cloudAccounts);
      })
      .catch(error => {
        console.warn('Không thể tải danh sách tài khoản Admin an toàn:', error);
      });
    return () => { active = false; };
  }, [currentAdmin?.id, currentAdmin?.role]);

  // Clear search query when changing tabs
  useEffect(() => {
    setSearchQuery('');
  }, [activeTab]);

  // Helper log action
  const addLog = (action: string, tab: string, details: string) => {
    const newLog: EditHistory = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      username: currentAdmin?.username || 'system',
      role: currentAdmin?.role || 'super',
      action,
      tab,
      details
    };
    setEditHistories(prev => {
      const updated = [newLog, ...prev];
      localStorage.setItem('vovinam_edit_histories', JSON.stringify(updated));
      return updated;
    });
  };

  // Login handler
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    let account: AdminAccount | null = null;
    try {
      const response = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: loginUsername,
          password: loginPassword,
          remember: rememberMe
        })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.account) {
        setLoginError(payload.error || 'Tài khoản hoặc mật khẩu không chính xác!');
        return;
      }
      account = payload.account as AdminAccount;
      if (account.role === 'super') {
        const accountsResponse = await fetch('/api/admin-accounts', { cache: 'no-store' });
        const accountsPayload = await accountsResponse.json().catch(() => ({}));
        if (accountsResponse.ok && Array.isArray(accountsPayload.accounts)) {
          setAdminAccounts(accountsPayload.accounts);
        }
      }
    } catch (error) {
      console.error('Không thể đăng nhập Admin:', error);
      setLoginError('Không thể kết nối máy chủ đăng nhập. Vui lòng thử lại!');
      return;
    }

    if (account) {
      setCurrentAdmin(account);
      // Remember credentials if checked
      if (rememberMe) {
        localStorage.setItem('vovinam_current_admin', JSON.stringify(account));
        localStorage.setItem('vovinam_remembered_username', loginUsername);
        localStorage.removeItem('vovinam_remembered_password');
        localStorage.setItem('vovinam_remember_me_checked', 'true');
      } else {
        sessionStorage.setItem('vovinam_current_admin', JSON.stringify(account));
        localStorage.removeItem('vovinam_current_admin');
        localStorage.removeItem('vovinam_remembered_username');
        localStorage.removeItem('vovinam_remembered_password');
        localStorage.setItem('vovinam_remember_me_checked', 'false');
      }
      
      // Auto routing to their first allowed tab
      const firstAllowed = account.role === 'super' ? 'articles' : (account.permissions[0] as AdminTab || 'changePassword');
      setActiveTab(firstAllowed);
      
      // Create system log
      const logMsg = `Đăng nhập thành công vào trang quản trị (${account.role === 'super' ? 'Admin chính' : 'Admin phụ'})`;
      
      // Temporary log addition
      const newLog: EditHistory = {
        id: Date.now(),
        timestamp: new Date().toISOString(),
        username: account.username,
        role: account.role,
        action: 'Đăng nhập',
        tab: 'auth',
        details: logMsg
      };
      setEditHistories(prev => {
        const updated = [newLog, ...prev];
        localStorage.setItem('vovinam_edit_histories', JSON.stringify(updated));
        return updated;
      });
    } else {
      setLoginError('Tài khoản hoặc mật khẩu không chính xác!');
    }
  };

  // Logout handler
  const handleLogout = () => {
    addLog('Đăng xuất', 'auth', 'Đăng xuất khỏi hệ thống');
    void fetch('/api/admin-logout', { method: 'POST' }).catch(() => undefined);
    setCurrentAdmin(null);
    localStorage.removeItem('vovinam_current_admin');
    sessionStorage.removeItem('vovinam_current_admin');
  };

  const persistAdminAccountList = async (nextAccounts: AdminAccount[]) => {
    try {
      const response = await fetch('/api/admin-accounts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accounts: nextAccounts })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        showToast(payload.error || 'Không thể lưu danh sách tài khoản Admin.', 'error');
        return false;
      }
      setAdminAccounts(Array.isArray(payload.accounts) ? payload.accounts : []);
      return true;
    } catch (error) {
      console.error('Không thể lưu danh sách tài khoản Admin:', error);
      showToast('Không thể kết nối máy chủ để lưu tài khoản Admin.', 'error');
      return false;
    }
  };

  // Password Change Handler
  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentAdmin) return;

    if (newPassword.length < 8 || !/[A-Za-zÀ-ỹ]/u.test(newPassword) || !/\d/.test(newPassword)) {
      setPasswordError('Mật khẩu mới phải dài ít nhất 8 ký tự, có chữ và có số!');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setPasswordError('Xác nhận mật khẩu mới không khớp!');
      return;
    }

    try {
      const response = await fetch('/api/admin-change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setPasswordError(payload.error || 'Không thể thay đổi mật khẩu.');
        return;
      }
      const updatedAdmin = payload.account as AdminAccount;
      setCurrentAdmin(updatedAdmin);
      if (rememberMe) {
        localStorage.setItem('vovinam_current_admin', JSON.stringify(updatedAdmin));
        sessionStorage.removeItem('vovinam_current_admin');
      } else {
        sessionStorage.setItem('vovinam_current_admin', JSON.stringify(updatedAdmin));
        localStorage.removeItem('vovinam_current_admin');
      }
    } catch (error) {
      console.error('Không thể đổi mật khẩu:', error);
      setPasswordError('Không thể kết nối máy chủ để đổi mật khẩu.');
      return;
    }

    addLog('Đổi mật khẩu', 'security', `Người dùng '${currentAdmin.username}' đổi mật khẩu thành công`);
    setPasswordSuccess('Đã thay đổi mật khẩu tài khoản thành công!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  // Admin account add/edit save handler
  const handleSaveAdminAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminForm.username || !adminForm.name || (editAdminId === null && !adminForm.password)) {
      showToast('Vui lòng điền đầy đủ các thông tin bắt buộc!', 'error');
      return;
    }

    const uName = adminForm.username.trim().toLowerCase();
    if (editAdminId === null) {
      // Create new
      if (adminAccounts.some(acc => acc.username.toLowerCase() === uName)) {
        showToast('Tài khoản này đã tồn tại trên hệ thống!', 'error');
        return;
      }
      const newAcc: AdminAccount = {
        id: 'acc_' + Date.now(),
        username: uName,
        password: adminForm.password,
        role: adminForm.role || 'assistant',
        name: adminForm.name,
        permissions: adminForm.permissions || []
      };
      if (!await persistAdminAccountList([...adminAccounts, newAcc])) return;
      addLog('Cấp tài khoản', 'admins', `Cấp tài khoản Admin phụ mới: ${newAcc.username} (${newAcc.name})`);
      showToast('Cấp tài khoản Admin phụ thành công!', 'success');
    } else {
      const nextAccounts = adminAccounts.map(acc =>
        acc.id === editAdminId
          ? {
              ...acc,
              ...adminForm,
              username: uName,
              password: adminForm.password || undefined
            } as AdminAccount
          : acc
      );
      if (!await persistAdminAccountList(nextAccounts)) return;
      addLog('Sửa tài khoản', 'admins', `Cập nhật thông tin tài khoản: ${uName} (${adminForm.name})`);
      showToast('Cập nhật tài khoản Admin thành công!', 'success');
    }

    setIsEditingAdmin(false);
    setEditAdminId(null);
    setAdminForm({ username: '', password: '', name: '', role: 'assistant', permissions: ['articles'] });
  };

  // Admin delete handler
  const handleDeleteAdmin = async (id: string, username: string) => {
    if (id === currentAdmin?.id) {
      showToast('Không thể xóa tài khoản Admin đang đăng nhập!', 'error');
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản '${username}'?`)) return;

    if (!await persistAdminAccountList(adminAccounts.filter(acc => acc.id !== id))) return;
    addLog('Xóa tài khoản', 'admins', `Đã xóa tài khoản: ${username}`);
    showToast('Xóa tài khoản Admin thành công!', 'success');
  };

  // Quick reset helpers
  const openNewForm = () => {
    setIsEditing(true);
    setEditId(null);
    setTypedClubCoachId('');
    setTypedHighlightAthleteId('');
    setArticleForm({ title: '', content: '', categoryId: categories[0]?.id || '', image: '', status: true, date: new Date().toISOString().split('T')[0], views: 0, showInNews: false, featuredDays: DEFAULT_LATEST_NEWS_DAYS });
    setCategoryForm({ id: '', name: '', order: categories.length + 1, status: true, description: '' });
    setCoachForm({ id: '', fullName: '', birthYear: 1990, rank: 'Hoàng Đai', clubId: clubs[0]?.id || '', experience: '', status: true, photo: '' });
    setMemberForm({
      id: '',
      displayOrder: Math.max(0, ...members.map(member => member.displayOrder || 0)) + 1,
      fullName: '',
      birthYear: 2005,
      rank: 'Lam Đai',
      clubId: clubs[0]?.id || '',
      status: true,
      photo: ''
    });
    setAchievementForm({ id: '', title: '', unit: '', medalType: 'Vàng', date: new Date().toISOString().split('T')[0], status: true, image: '', memberIds: [], tournamentId: '', tournamentName: '', year: new Date().getFullYear().toString(), meaning: '', journey: '', honorTitle: '', honorQuote: '', honorAttribution: '' });
    setTournamentForm({ id: '', name: '', date: '', location: '', status: 'sắp diễn ra', image: '', googleMapPlaceName: '', googleMapUrl: '' });
    setClubForm({ id: '', name: '', headCoach: '', address: '', trainingDays: '', trainingHours: '', status: true, image: '', coachIds: [], googleMapPlaceName: '', googleMapUrl: '' });
    setHighlightForm({ id: '', title: '', athleteName: '', mediaType: 'video', status: true, thumbnail: '', mediaUrls: [''], mediaNotes: [''], tournamentId: '', tournamentName: '' });
  };

  // Delete Handlers
  const handleDelete = (tab: AdminTab, id: string | number) => {
    // Find item name for log description
    let itemName = id.toString();
    if (tab === 'articles') itemName = articles.find(a => a.id === id)?.title || id.toString();
    if (tab === 'coaches') itemName = coaches.find(c => c.id === id)?.fullName || id.toString();
    if (tab === 'members') itemName = members.find(m => m.id === id)?.fullName || id.toString();
    if (tab === 'clubs') itemName = clubs.find(c => c.id === id)?.name || id.toString();
    if (tab === 'categories') itemName = categories.find(c => c.id === id)?.name || id.toString();
    if (tab === 'achievements') itemName = achievements.find(a => a.id === id)?.title || id.toString();
    if (tab === 'tournaments') itemName = tournaments.find(t => t.id === id)?.name || id.toString();
    if (tab === 'highlights') itemName = highlights.find(h => h.id === id)?.title || id.toString();

    setDeleteConfirm({ tab, id, name: itemName });
  };

  const handleConfirmDelete = () => {
    if (!deleteConfirm) return;
    const { tab, id, name: itemName } = deleteConfirm;

    switch (tab) {
      case 'articles':
        setArticles(prev => prev.filter(item => item.id !== id));
        break;
      case 'categories':
        setCategories(prev => prev.filter(item => item.id !== id));
        break;
      case 'coaches':
        setCoaches(prev => prev.filter(item => item.id !== id));
        break;
      case 'members':
        setMembers(prev => {
          const remainingMembers = prev
            .filter(item => item.id !== id)
            .sort((a, b) =>
              (a.displayOrder ?? Number.MAX_SAFE_INTEGER) -
              (b.displayOrder ?? Number.MAX_SAFE_INTEGER)
            );

          // Keep display IDs continuous after deletion: 1, 2, 3, ...
          // Technical IDs (for example TV001) remain untouched so achievement
          // and club references never break.
          return remainingMembers.map((member, index) => ({
            ...member,
            displayOrder: index + 1
          }));
        });
        break;
      case 'achievements':
        setAchievements(prev => prev.filter(item => item.id !== id));
        break;
      case 'tournaments':
        setTournaments(prev => prev.filter(item => item.id !== id));
        break;
      case 'clubs':
        setClubs(prev => prev.filter(item => item.id !== id));
        break;
      case 'highlights':
        setHighlights(prev => prev.filter(item => item.id !== id));
        break;
    }

    addLog('Xóa', tab, `Đã xóa mục: "${itemName}" (ID: ${id})`);
    setDeleteConfirm(null);
    showToast('Xóa dữ liệu thành công!', 'success');
  };

  // Edit Handlers (Load to Form)
  const handleEditClick = (tab: AdminTab, item: any) => {
    setIsEditing(true);
    setEditId(item.id);
    switch (tab) {
      case 'articles':
        setArticleForm(item);
        break;
      case 'categories':
        setCategoryForm(item);
        break;
      case 'coaches':
        setCoachForm(item);
        break;
      case 'members':
        if (item.displayOrder) {
          setMemberForm(item);
        } else {
          let suggestedOrder = Math.max(1, members.findIndex(member => member.id === item.id) + 1);
          while (members.some(member => member.id !== item.id && member.displayOrder === suggestedOrder)) {
            suggestedOrder += 1;
          }
          setMemberForm({ ...item, displayOrder: suggestedOrder });
        }
        break;
      case 'achievements':
        const legacyHonor = extractLegacyAchievementHonor(item.journey);
        setAchievementForm({
          memberIds: [],
          tournamentId: '',
          tournamentName: '',
          year: item.date ? new Date(item.date).getFullYear().toString() : new Date().getFullYear().toString(),
          ...item,
          journey: legacyHonor.remainingJourney,
          honorTitle: item.honorTitle?.trim() || legacyHonor.title,
          honorQuote: item.honorQuote?.trim() || legacyHonor.quote,
          honorAttribution: item.honorAttribution?.trim() || legacyHonor.attribution
        });
        break;
      case 'tournaments':
        setTournamentForm({
          googleMapPlaceName: item.googleMapPlaceName || '',
          googleMapUrl: item.googleMapUrl || '',
          ...item
        });
        break;
      case 'clubs': {
        const associatedCoachIds = coaches.filter(c => c.clubId === item.id).map(c => c.id);
        setClubForm({
          coachIds: item.coachIds ? item.coachIds : associatedCoachIds,
          googleMapUrl: item.googleMapUrl || '',
          ...item
        });
        const matched = coaches.find(c => c.id === item.headCoach || c.fullName === item.headCoach);
        setTypedClubCoachId(matched ? matched.id : item.headCoach || '');
        break;
      }
      case 'highlights':
        setHighlightForm({
          ...item,
          mediaUrls: item.mediaUrls && item.mediaUrls.length > 0 ? item.mediaUrls : [''],
          mediaNotes: (item.mediaUrls && item.mediaUrls.length > 0 ? item.mediaUrls : [''])
            .map((_, index) => item.mediaNotes?.[index] || '')
        });
        const matchedAthlete = coaches.find(c => c.id === item.athleteName || c.fullName === item.athleteName) ||
                               members.find(m => m.id === item.athleteName || m.fullName === item.athleteName);
        setTypedHighlightAthleteId(matchedAthlete ? matchedAthlete.id : item.athleteName || '');
        break;
    }
  };

  // Save Forms Handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === 'articles') {
      const normalizedContent = normalizeArticleContentForStorage(articleForm.content || '');
      if (!articleContentToPlainText(normalizedContent).trim()) {
        showToast('Vui lòng nhập nội dung bài viết!', 'error');
        return;
      }
      let finalId: string | number = articleForm.id !== undefined ? articleForm.id : '';
      if (typeof finalId === 'string') finalId = finalId.trim();
      
      // If blank ID is provided for new article, auto-generate it
      if (!finalId) {
        finalId = articles.length > 0 ? Math.max(...articles.map(a => {
          const parsed = parseInt(String(a.id), 10);
          return isNaN(parsed) ? 0 : parsed;
        })) + 1 : 1;
      } else {
        // Try to parse to number if it's purely numeric
        const numParsed = parseInt(String(finalId), 10);
        if (!isNaN(numParsed) && String(numParsed) === String(finalId)) {
          finalId = numParsed;
        }
      }

      if (editId === null) {
        if (articles.some(a => String(a.id) === String(finalId))) {
          showToast('ID bài viết này đã tồn tại!', 'error');
          return;
        }
        const newArt: Article = {
          id: finalId,
          title: articleForm.title || 'Bài viết mới',
          content: normalizedContent,
          categoryId: articleForm.categoryId || categories[0]?.id || 'TIN_CLB',
          image: articleForm.image || 'https://images.unsplash.com/photo-1555597673-b21d5c935865?auto=format&fit=crop&w=800&q=80',
          date: articleForm.date || new Date().toISOString().split('T')[0],
          views: articleForm.views || 0,
          status: articleForm.status !== undefined ? articleForm.status : true,
          showInNews: articleForm.showInNews || false,
          featuredDays: normalizeLatestNewsDays(articleForm.featuredDays),
          featuredAt: articleForm.showInNews
            ? (articleForm.featuredAt || new Date().toISOString())
            : undefined,
        };
        setArticles(prev => [newArt, ...prev]);
        addLog('Thêm', 'articles', `Đã thêm bài viết mới: "${newArt.title}" (ID: ${finalId})`);
        showToast('Thêm bài viết mới thành công!', 'success');
      } else {
        if (String(finalId) !== String(editId) && articles.some(a => String(a.id) === String(finalId))) {
          showToast('ID bài viết này đã tồn tại!', 'error');
          return;
        }
        setArticles(prev => prev.map(a => String(a.id) === String(editId) ? {
          ...a,
          ...articleForm,
          id: finalId,
          content: normalizedContent,
          featuredDays: normalizeLatestNewsDays(articleForm.featuredDays),
          featuredAt: articleForm.showInNews
            ? (articleForm.featuredAt || new Date().toISOString())
            : undefined,
        } as Article : a));
        addLog('Sửa', 'articles', `Đã cập nhật bài viết: "${articleForm.title}" (ID: ${finalId})`);
        showToast('Cập nhật bài viết thành công!', 'success');
      }
    } else if (activeTab === 'categories') {
      const catId = categoryForm.id?.trim() || '';
      if (!catId) { showToast('Vui lòng nhập ID tự chọn', 'error'); return; }
      if (editId === null) {
        if (categories.some(c => c.id === catId)) { showToast('ID này đã tồn tại!', 'error'); return; }
        setCategories(prev => [...prev, categoryForm as Category]);
        addLog('Thêm', 'categories', `Đã thêm danh mục mới: "${categoryForm.name}" (ID: ${catId})`);
        showToast('Thêm danh mục mới thành công!', 'success');
      } else {
        if (catId !== editId && categories.some(c => c.id === catId)) {
          showToast('Mã ID mới này đã tồn tại trên hệ thống!', 'error');
          return;
        }
        setCategories(prev => prev.map(c => c.id === editId ? { ...c, ...categoryForm, id: catId } as Category : c));
        addLog('Sửa', 'categories', `Đã cập nhật danh mục: "${categoryForm.name}" (ID: ${catId})`);
        showToast('Cập nhật danh mục thành công!', 'success');
      }
    } else if (activeTab === 'coaches') {
      const id = coachForm.id?.trim() || '';
      if (!id) { showToast('Vui lòng nhập ID tự chọn', 'error'); return; }
      if (editId === null) {
        if (coaches.some(c => c.id === id)) { showToast('ID này đã tồn tại!', 'error'); return; }
        setCoaches(prev => [...prev, coachForm as Coach]);
        addLog('Thêm', 'coaches', `Đã thêm huấn luyện viên mới: "${coachForm.fullName}" (ID: ${id})`);
        showToast('Thêm huấn luyện viên thành công!', 'success');
      } else {
        if (id !== editId && coaches.some(c => c.id === id)) {
          showToast('Mã ID mới này đã tồn tại trên hệ thống!', 'error');
          return;
        }
        setCoaches(prev => prev.map(c => c.id === editId ? { ...c, ...coachForm, id } as Coach : c));
        addLog('Sửa', 'coaches', `Đã cập nhật huấn luyện viên: "${coachForm.fullName}" (ID: ${id})`);
        showToast('Cập nhật huấn luyện viên thành công!', 'success');
      }
    } else if (activeTab === 'members') {
      const id = memberForm.id?.trim() || '';
      if (!id) { showToast('Vui lòng nhập ID tự chọn', 'error'); return; }
      const displayOrder = Number(memberForm.displayOrder);
      if (!Number.isInteger(displayOrder) || displayOrder < 1) {
        showToast('ID thứ tự hiển thị phải là số nguyên từ 1 trở lên', 'error');
        return;
      }
      const conflictingMember = members.find(m => m.id !== editId && Number(m.displayOrder) === displayOrder);
      const finalMember = { ...memberForm, id, displayOrder } as Member;
      if (editId === null) {
        if (conflictingMember) {
          showToast('ID thứ tự hiển thị này đã được sử dụng!', 'error');
          return;
        }
        if (members.some(m => m.id === id)) { showToast('ID này đã tồn tại!', 'error'); return; }
        setMembers(prev => [...prev, finalMember].sort((a, b) =>
          Number(a.displayOrder ?? Number.MAX_SAFE_INTEGER) - Number(b.displayOrder ?? Number.MAX_SAFE_INTEGER)
        ));
        addLog('Thêm', 'members', `Đã thêm thành viên CLB mới: "${memberForm.fullName}" (ID: ${id})`);
        showToast('Thêm thành viên CLB mới thành công!', 'success');
      } else {
        if (id !== editId && members.some(m => m.id === id)) {
          showToast('Mã ID mới này đã tồn tại trên hệ thống!', 'error');
          return;
        }
        const originalMember = members.find(m => m.id === editId);
        const originalDisplayOrder = Number(originalMember?.displayOrder);
        if (conflictingMember) {
          const shouldSwap = window.confirm(
            `ID thứ tự ${displayOrder} đang thuộc về "${conflictingMember.fullName}".\n\n` +
            `Bạn có muốn hoán đổi không?\n` +
            `• ${memberForm.fullName}: ${originalDisplayOrder} → ${displayOrder}\n` +
            `• ${conflictingMember.fullName}: ${displayOrder} → ${originalDisplayOrder}`
          );
          if (!shouldSwap) return;
        }
        setMembers(prev => prev
          .map(m => {
            if (m.id === editId) return finalMember;
            if (conflictingMember && m.id === conflictingMember.id) {
              return { ...m, displayOrder: originalDisplayOrder };
            }
            return m;
          })
          .sort((a, b) =>
            Number(a.displayOrder ?? Number.MAX_SAFE_INTEGER) - Number(b.displayOrder ?? Number.MAX_SAFE_INTEGER)
          ));
        if (id !== editId) {
          setAchievements(prev => prev.map(achievement => ({
            ...achievement,
            memberIds: achievement.memberIds?.map(memberId => memberId === editId ? id : memberId)
          })));
        }
        addLog('Sửa', 'members', conflictingMember
          ? `Đã hoán đổi thứ tự hiển thị ${originalDisplayOrder} ↔ ${displayOrder} giữa "${memberForm.fullName}" và "${conflictingMember.fullName}"`
          : `Đã cập nhật thành viên CLB: "${memberForm.fullName}" (ID: ${id})`);
        showToast(conflictingMember ? 'Hoán đổi ID thứ tự thành công!' : 'Cập nhật thành viên CLB thành công!', 'success');
      }
    } else if (activeTab === 'achievements') {
      const id = achievementForm.id?.trim() || '';
      if (!id) { showToast('Vui lòng nhập ID tự chọn', 'error'); return; }
      if (editId === null) {
        if (achievements.some(a => a.id === id)) { showToast('ID này đã tồn tại!', 'error'); return; }
        setAchievements(prev => [...prev, achievementForm as Achievement]);
        addLog('Thêm', 'achievements', `Đã thêm thành tích mới: "${achievementForm.title}" (ID: ${id})`);
        showToast('Thêm thành tích mới thành công!', 'success');
      } else {
        if (id !== editId && achievements.some(a => a.id === id)) {
          showToast('Mã ID mới này đã tồn tại trên hệ thống!', 'error');
          return;
        }
        setAchievements(prev => prev.map(a => a.id === editId ? { ...a, ...achievementForm, id } as Achievement : a));
        addLog('Sửa', 'achievements', `Đã cập nhật thành tích: "${achievementForm.title}" (ID: ${id})`);
        showToast('Cập nhật thành tích thành công!', 'success');
      }
    } else if (activeTab === 'tournaments') {
      const id = tournamentForm.id?.trim() || '';
      if (!id) { showToast('Vui lòng nhập ID tự chọn', 'error'); return; }
      const tournamentLocation = tournamentForm.location?.trim() || '';
      const tournamentPlaceName = tournamentForm.googleMapPlaceName?.trim() || '';
      const tournamentMapQuery = [
        tournamentPlaceName || tournamentForm.name,
        tournamentLocation,
        'Việt Nam'
      ].filter(Boolean).join(', ');
      const finalTournamentForm = {
        ...tournamentForm,
        id,
        location: tournamentLocation,
        googleMapPlaceName: tournamentPlaceName,
        googleMapUrl: buildGoogleMapsEmbedUrl(tournamentForm.googleMapUrl, tournamentMapQuery)
      } as Tournament;
      if (editId === null) {
        if (tournaments.some(t => t.id === id)) { showToast('ID này đã tồn tại!', 'error'); return; }
        setTournaments(prev => [...prev, finalTournamentForm]);
        addLog('Thêm', 'tournaments', `Đã thêm giải đấu mới: "${tournamentForm.name}" (ID: ${id})`);
        showToast('Thêm giải đấu mới thành công!', 'success');
      } else {
        if (id !== editId && tournaments.some(t => t.id === id)) {
          showToast('ID này đã tồn tại ở giải đấu khác!', 'error');
          return;
        }
        const updatedTournamentName = tournamentForm.name || '';
        setTournaments(prev => prev.map(t => t.id === editId ? { ...t, ...finalTournamentForm, id } as Tournament : t));
        setAchievements(prev => prev.map(achievement =>
          achievement.tournamentId === editId
            ? { ...achievement, tournamentId: id, tournamentName: updatedTournamentName }
            : achievement
        ));
        setHighlights(prev => prev.map(highlight =>
          highlight.tournamentId === editId
            ? { ...highlight, tournamentId: id, tournamentName: updatedTournamentName }
            : highlight
        ));
        addLog('Sửa', 'tournaments', `Đã cập nhật giải đấu: "${tournamentForm.name}" (ID: ${id})`);
        showToast('Cập nhật giải đấu thành công!', 'success');
      }
    } else if (activeTab === 'clubs') {
      const id = clubForm.id?.trim() || '';
      if (!id) { showToast('Vui lòng nhập ID tự chọn', 'error'); return; }
      const clubAddress = clubForm.address?.trim() || '';
      const clubPlaceName = clubForm.googleMapPlaceName?.trim() || '';
      const clubMapQuery = [
        clubPlaceName || clubForm.name,
        clubAddress,
        'Việt Nam'
      ].filter(Boolean).join(', ');
      const finalClubForm = {
        ...clubForm,
        id,
        address: clubAddress,
        googleMapPlaceName: clubPlaceName,
        googleMapUrl: buildGoogleMapsEmbedUrl(clubForm.googleMapUrl, clubMapQuery)
      };

      // Update associated coaches
      const selectedCoachIds = clubForm.coachIds || [];
      setCoaches(prev => prev.map(coach => {
        if (selectedCoachIds.includes(coach.id)) {
          return { ...coach, clubId: id };
        } else if (coach.clubId === id || (editId !== null && coach.clubId === editId)) {
          return { ...coach, clubId: '' };
        }
        return coach;
      }));

      if (editId === null) {
        if (clubs.some(c => c.id === id)) { showToast('ID này đã tồn tại!', 'error'); return; }
        setClubs(prev => [...prev, finalClubForm as Club]);
        addLog('Thêm', 'clubs', `Đã thêm câu lạc bộ mới: "${clubForm.name}" (ID: ${id})`);
        showToast('Thêm câu lạc bộ mới thành công!', 'success');
      } else {
        if (id !== editId && clubs.some(c => c.id === id)) {
          showToast('Mã ID mới này đã tồn tại trên hệ thống!', 'error');
          return;
        }
        setClubs(prev => prev.map(c => c.id === editId ? { ...c, ...finalClubForm, id } as Club : c));
        addLog('Sửa', 'clubs', `Đã cập nhật câu lạc bộ: "${clubForm.name}" (ID: ${id})`);
        showToast('Cập nhật câu lạc bộ thành công!', 'success');
      }
    } else if (activeTab === 'highlights') {
      if (isUploadingHighlightMedia) {
        showToast('Vui lòng chờ ảnh tải xong rồi mới bấm Lưu dữ liệu.', 'info');
        return;
      }
      const id = highlightForm.id?.trim() || '';
      if (!id) { showToast('Vui lòng nhập ID tự chọn', 'error'); return; }
      const mediaPairs = (highlightForm.mediaUrls || [])
        .map((url, index) => ({ url: url.trim(), note: highlightForm.mediaNotes?.[index]?.trim() || '' }))
        .filter(item => item.url !== '');
      if (mediaPairs.length > MAX_HIGHLIGHT_IMAGES) {
        showToast(`Mỗi Highlight được lưu tối đa ${MAX_HIGHLIGHT_IMAGES} ảnh.`, 'error');
        return;
      }

      const legacyImageIndexes = mediaPairs
        .map((item, index) => item.url.startsWith('data:image/') ? index : -1)
        .filter(index => index >= 0);
      if (mediaPairs.some(item => item.url.startsWith('data:video/'))) {
        showToast('Video từ máy không thể lưu trong Firestore. Hãy xóa video đó và dùng URL/YouTube.', 'error');
        return;
      }

      if (legacyImageIndexes.length > 0) {
        setIsUploadingHighlightMedia(true);
        setHighlightUploadProgress({ current: 0, total: legacyImageIndexes.length });
        try {
          for (let position = 0; position < legacyImageIndexes.length; position += 1) {
            const mediaIndex = legacyImageIndexes[position];
            const legacyResponse = await fetch(mediaPairs[mediaIndex].url);
            const legacyBlob = await legacyResponse.blob();
            const legacyFile = new File(
              [legacyBlob],
              `anh-cu-${mediaIndex + 1}.${legacyBlob.type.split('/')[1] || 'jpg'}`,
              { type: legacyBlob.type || 'image/jpeg' }
            );
            mediaPairs[mediaIndex].url = await compressAndUploadHighlightImage(legacyFile);
            setHighlightUploadProgress({ current: position + 1, total: legacyImageIndexes.length });
          }
          setHighlightForm(previous => ({
            ...previous,
            mediaUrls: mediaPairs.map(item => item.url),
            mediaNotes: mediaPairs.map(item => item.note)
          }));
        } catch (error) {
          showToast(
            error instanceof Error ? `Không thể chuyển ảnh cũ: ${error.message}` : 'Không thể chuyển ảnh cũ lên Firebase.',
            'error'
          );
          return;
        } finally {
          setIsUploadingHighlightMedia(false);
          setHighlightUploadProgress(null);
        }
      }

      const finalMediaUrls = mediaPairs.map(item => item.url);
      const finalMediaNotes = mediaPairs.map(item => item.note);
      if (editId === null) {
        if (highlights.some(h => h.id === id)) { showToast('ID này đã tồn tại!', 'error'); return; }
        setHighlights(prev => [...prev, { ...highlightForm, mediaUrls: finalMediaUrls, mediaNotes: finalMediaNotes } as Highlight]);
        addLog('Thêm', 'highlights', `Đã thêm Highlight mới: "${highlightForm.title}" (ID: ${id})`);
        showToast('Thêm highlight mới thành công!', 'success');
      } else {
        if (id !== editId && highlights.some(h => h.id === id)) {
          showToast('Mã ID mới này đã tồn tại trên hệ thống!', 'error');
          return;
        }
        setHighlights(prev => prev.map(h => h.id === editId ? { ...h, ...highlightForm, id, mediaUrls: finalMediaUrls, mediaNotes: finalMediaNotes } as Highlight : h));
        addLog('Sửa', 'highlights', `Đã cập nhật Highlight: "${highlightForm.title}" (ID: ${id})`);
        showToast('Cập nhật highlight thành công!', 'success');
      }
    } else if (activeTab === 'webConfig') {
      setWebConfig(webConfigForm);
      addLog('Cấu hình', 'webConfig', `Cập nhật cấu hình chung của website CLB`);
      showToast('Đã cập nhật cấu hình website thành công!', 'success');
    }
    
    setIsEditing(false);
    setEditId(null);
  };

  // Database status and sync states
  const [dbStatus, setDbStatus] = useState<any>(null);
  const [loadingDbStatus, setLoadingDbStatus] = useState(false);
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);
  const [isFetchingCloud, setIsFetchingCloud] = useState(false);
  const [isOptimizingMedia, setIsOptimizingMedia] = useState(false);
  const [backupStatus, setBackupStatus] = useState<any>(null);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isImportingBackup, setIsImportingBackup] = useState(false);

  const buildLocalBackupData = () => ({
    vovinam_categories: categories,
    vovinam_articles: articles,
    vovinam_members: members,
    vovinam_coaches: coaches,
    vovinam_achievements: achievements,
    vovinam_tournaments: tournaments,
    vovinam_clubs: clubs,
    vovinam_highlights: highlights,
    vovinam_webConfig: activeTab === 'webConfig' ? webConfigForm : webConfig
  });

  const downloadLocalBackup = (prefix = 'vovinam_database_backup') => {
    const jsonStr = JSON.stringify(buildLocalBackupData(), null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    link.href = url;
    link.download = `${prefix}_${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    localStorage.setItem('vovinam_last_local_backup_at', String(Date.now()));
  };

  const fetchBackupStatus = () => {
    fetch('/api/backup-status', { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error(`Backup status failed (${res.status})`);
        return res.json();
      })
      .then(setBackupStatus)
      .catch(err => {
        console.error('Không thể kiểm tra trạng thái sao lưu:', err);
        setBackupStatus({ available: false, error: err.message || String(err) });
      });
  };

  const handleCreateCloudBackup = async () => {
    try {
      setIsCreatingBackup(true);
      const res = await fetch('/api/backup-now', { method: 'POST' });
      const payload = await res.json();
      if (!res.ok || !payload.success) {
        throw new Error(payload.error || `Backup failed (${res.status})`);
      }
      downloadLocalBackup('vovinam_verified_backup');
      showToast('Đã tạo bản sao lưu Cloud và tải thêm bản JSON về máy!', 'success');
      addLog('Sao lưu', 'system', 'Đã tạo bản sao lưu Cloud thủ công và bản JSON cục bộ');
      fetchBackupStatus();
    } catch (err) {
      console.error(err);
      showToast('Không thể tạo bản sao lưu. Không thực hiện thao tác ghi đè!', 'error');
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleOptimizeExistingMedia = async () => {
    if (!window.confirm(
      'Hệ thống sẽ sao lưu trước, sau đó chuyển ảnh đang nhúng trong dữ liệu sang kho ảnh riêng. Nội dung, logo và banner không bị xóa. Tiếp tục?'
    )) return;

    try {
      setIsOptimizingMedia(true);
      downloadLocalBackup('vovinam_before_media_optimization');

      const backupRes = await fetch('/api/backup-now', { method: 'POST' });
      const backupPayload = await backupRes.json().catch(() => ({}));
      if (!backupRes.ok || !backupPayload.success) {
        throw new Error(backupPayload.error || 'Không tạo được bản sao lưu Cloud trước khi tối ưu ảnh.');
      }

      const optimized = await externalizeInlineImages(buildLocalBackupData());
      const savePayload = {
        categories: optimized.vovinam_categories,
        articles: optimized.vovinam_articles,
        members: optimized.vovinam_members,
        coaches: optimized.vovinam_coaches,
        achievements: optimized.vovinam_achievements,
        tournaments: optimized.vovinam_tournaments,
        clubs: optimized.vovinam_clubs,
        highlights: optimized.vovinam_highlights,
        webConfig: optimized.vovinam_webConfig
      };

      const saveRes = await fetch('/api/save-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(savePayload)
      });
      const saveResult = await saveRes.json().catch(() => ({}));
      if (!saveRes.ok || !saveResult.success) {
        throw new Error(saveResult.error || 'Không thể lưu dữ liệu đã tối ưu lên Cloud.');
      }

      if (applyCloudSnapshot) {
        applyCloudSnapshot(savePayload);
      } else {
        setCategories(savePayload.categories);
        setArticles(savePayload.articles);
        setMembers(savePayload.members);
        setCoaches(savePayload.coaches);
        setAchievements(savePayload.achievements);
        setTournaments(savePayload.tournaments);
        setClubs(savePayload.clubs);
        setHighlights(savePayload.highlights);
        setWebConfig(savePayload.webConfig);
      }

      showToast('Đã sao lưu và tối ưu kho ảnh thành công. Dữ liệu cũ vẫn được giữ nguyên.', 'success');
      addLog('Tối ưu', 'dbSync', 'Đã tách ảnh nhúng khỏi dữ liệu JSON sau khi tạo bản sao lưu');
      fetchDbStatus();
      fetchBackupStatus();
    } catch (err) {
      console.error(err);
      showToast(err instanceof Error ? err.message : 'Không thể tối ưu kho ảnh.', 'error');
    } finally {
      setIsOptimizingMedia(false);
    }
  };

  const fetchDbStatus = () => {
    setLoadingDbStatus(true);
    fetch('/api/db-status')
      .then(res => {
        if (!res.ok) {
          return res.text().then(text => {
            throw new Error(`Mã lỗi ${res.status}: ${text.substring(0, 120)}`);
          });
        }
        return res.json();
      })
      .then(data => {
        setDbStatus(data);
        setLoadingDbStatus(false);
      })
      .catch(err => {
        console.error("Failed to fetch database status:", err);
        setDbStatus({ error: err.message || String(err) });
        setLoadingDbStatus(false);
      });
  };

  useEffect(() => {
    if (activeTab === 'dbSync' || activeTab === 'webConfig') {
      fetchDbStatus();
      fetchBackupStatus();
    }
  }, [activeTab]);

  useEffect(() => {
    if (currentAdmin?.role !== 'super') return;
    fetchBackupStatus();
    const handleSyncSuccess = () => {
      window.setTimeout(fetchBackupStatus, 800);
    };
    window.addEventListener('vovinam-sync-success', handleSyncSuccess);
    const interval = window.setInterval(fetchBackupStatus, 5 * 60 * 1000);
    return () => {
      window.removeEventListener('vovinam-sync-success', handleSyncSuccess);
      window.clearInterval(interval);
    };
  }, [currentAdmin?.role]);

  const handleForceUploadToCloud = async () => {
    downloadLocalBackup('vovinam_before_cloud_overwrite');
    const confirmation = window.prompt(
      'CẢNH BÁO: thao tác này ghi đè toàn bộ Cloud. Hệ thống vừa tải một bản JSON dự phòng. Chỉ tiếp tục khi thật sự cần thiết. Nhập chính xác: GHI DE CLOUD'
    );
    if (confirmation !== 'GHI DE CLOUD') {
      showToast('Đã hủy ghi đè Cloud. Dữ liệu không thay đổi.', 'info');
      return;
    }

    try {
      setIsSyncingCloud(true);
      const backupRes = await fetch('/api/backup-now', { method: 'POST' });
      const backupPayload = await backupRes.json();
      if (!backupRes.ok || !backupPayload.success) {
        throw new Error('Không tạo được bản sao lưu Cloud trước khi ghi đè.');
      }
      const res = await fetch('/api/save-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categories,
          articles,
          members,
          coaches,
          achievements,
          tournaments,
          clubs,
          highlights,
          webConfig
        })
      });

      if (!res.ok) throw new Error("Server error");
      const result = await res.json();
      if (result.success) {
        showToast('Đồng bộ lên Cloud thành công! Dữ liệu thực đã được cập nhật cho tất cả mọi người truy cập!', 'success');
        addLog('Đồng bộ', 'dbSync', 'Đã đẩy toàn bộ dữ liệu máy khách lên Cloud Database');
        fetchDbStatus();
        fetchBackupStatus();
      } else {
        showToast('Không thể lưu dữ liệu lên Cloud!', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi mạng hoặc server không phản hồi!', 'error');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  const handleForceDownloadFromCloud = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn tải dữ liệu từ Cloud về máy? Hành động này sẽ ghi đè toàn bộ dữ liệu hiện tại của trình duyệt này bằng dữ liệu mới nhất từ Cloud.")) {
      return;
    }

    try {
      setIsFetchingCloud(true);
      downloadLocalBackup('vovinam_before_cloud_download');
      const res = await fetch('/api/data');
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      if (data) {
        if (applyCloudSnapshot) {
          applyCloudSnapshot(data);
        } else {
          if (data.categories) setCategories(data.categories);
          if (data.articles) setArticles(data.articles);
          if (data.members) setMembers(data.members);
          if (data.coaches) setCoaches(data.coaches);
          if (data.achievements) setAchievements(data.achievements);
          if (data.tournaments) setTournaments(data.tournaments);
          if (data.clubs) setClubs(data.clubs);
          if (data.highlights) setHighlights(data.highlights);
          if (data.webConfig) setWebConfig(data.webConfig);
        }

        showToast('Đã tải và đồng bộ dữ liệu mới nhất từ Cloud thành công!', 'success');
        addLog('Đồng bộ', 'dbSync', 'Đã kéo dữ liệu từ Cloud Database xuống trình duyệt');
      }
    } catch (err) {
      console.error(err);
      showToast('Lỗi tải dữ liệu từ Cloud!', 'error');
    } finally {
      setIsFetchingCloud(false);
    }
  };

  // Small in-memory indexes keep smart searching responsive as data grows.
  const categoryById = useMemo(
    () => new Map(categories.map(item => [item.id, item])),
    [categories]
  );
  const clubById = useMemo(
    () => new Map(clubs.map(item => [item.id, item])),
    [clubs]
  );
  const tournamentById = useMemo(
    () => new Map(tournaments.map(item => [item.id, item])),
    [tournaments]
  );
  const memberById = useMemo(
    () => new Map(members.map(item => [item.id, item])),
    [members]
  );
  const coachById = useMemo(
    () => new Map(coaches.map(item => [item.id, item])),
    [coaches]
  );
  const achievementsByPersonId = useMemo(() => {
    const index = new Map<string, Achievement[]>();
    achievements.forEach(achievement => {
      (achievement.memberIds || []).forEach(personId => {
        const current = index.get(personId) || [];
        current.push(achievement);
        index.set(personId, current);
      });
    });
    return index;
  }, [achievements]);
  const coachesByClubId = useMemo(() => {
    const index = new Map<string, Coach[]>();
    coaches.forEach(coach => {
      const current = index.get(coach.clubId) || [];
      current.push(coach);
      index.set(coach.clubId, current);
    });
    return index;
  }, [coaches]);

  // Filtered lists for rendering
  const getFilteredData = () => {
    switch (activeTab) {
      case 'articles': {
        const filteredArticles = articles.filter(a => {
          const category = categoryById.get(a.categoryId);
          return matchesSmartSearch(
            searchQuery,
            a.id,
            a.title,
            a.content,
            a.categoryId,
            category?.name,
            category?.description,
            a.date,
            a.views,
            a.status ? 'hiển thị hoạt động' : 'đang ẩn',
            a.showInNews ? 'tin tức mới nhất nổi bật' : '',
            a.featuredDays
          );
        });
        return filteredArticles.sort((a, b) => {
          const idA = parseInt(String(a.id), 10);
          const idB = parseInt(String(b.id), 10);
          if (!isNaN(idA) && !isNaN(idB)) {
            return idB - idA;
          }
          return String(b.id).localeCompare(String(a.id), undefined, { numeric: true, sensitivity: 'base' });
        });
      }
      case 'categories':
        return categories.filter(c => matchesSmartSearch(
          searchQuery,
          c.id,
          c.name,
          c.order,
          c.description,
          c.status ? 'hiển thị hoạt động' : 'đang ẩn'
        ));
      case 'coaches':
        return coaches.filter(c => {
          const club = clubById.get(c.clubId);
          const relatedAchievements = achievementsByPersonId.get(c.id) || [];
          return matchesSmartSearch(
            searchQuery,
            c.id,
            c.fullName,
            c.experience,
            c.rank,
            c.birthYear,
            c.clubId,
            club?.name,
            club?.address,
            relatedAchievements.map(item => [
              item.id,
              item.title,
              item.medalType,
              item.year,
              item.date,
              item.tournamentId,
              item.tournamentName
            ]),
            c.status ? 'hiển thị hoạt động' : 'đang ẩn'
          );
        });
      case 'members':
        return members
          .filter(m => {
            const club = clubById.get(m.clubId);
            const relatedAchievements = achievementsByPersonId.get(m.id) || [];
            return matchesSmartSearch(
              searchQuery,
              m.id,
              m.displayOrder,
              m.fullName,
              m.rank,
              m.birthYear,
              m.clubId,
              club?.name,
              club?.address,
              relatedAchievements.map(item => [
                item.id,
                item.title,
                item.medalType,
                item.year,
                item.date,
                item.tournamentId,
                item.tournamentName
              ]),
              m.status ? 'hiển thị hoạt động' : 'đang ẩn'
            );
          })
          .sort((a, b) => {
            const orderDifference = Number(a.displayOrder ?? Number.MAX_SAFE_INTEGER) -
              Number(b.displayOrder ?? Number.MAX_SAFE_INTEGER);
            return orderDifference !== 0
              ? orderDifference
              : a.id.localeCompare(b.id, undefined, { numeric: true, sensitivity: 'base' });
          });
      case 'achievements':
        return achievements.filter(a => {
          const tournament = a.tournamentId ? tournamentById.get(a.tournamentId) : undefined;
          const linkedPeople = (a.memberIds || []).flatMap(id => {
            const member = memberById.get(id);
            const coach = coachById.get(id);
            return [id, member?.fullName, coach?.fullName];
          });
          return matchesSmartSearch(
            searchQuery,
            a.id,
            a.title,
            a.athleteName,
            a.memberIds,
            linkedPeople,
            a.medalType,
            a.year,
            a.date,
            a.unit,
            a.tournamentId,
            a.tournamentName,
            tournament?.name,
            tournament?.location,
            a.meaning,
            a.journey,
            a.honorTitle,
            a.honorQuote,
            a.honorAttribution,
            a.status ? 'hiển thị hoạt động' : 'đang ẩn'
          );
        });
      case 'tournaments':
        return tournaments
          .filter(t => matchesSmartSearch(
            searchQuery,
            t.id,
            t.name,
            t.location,
            t.googleMapPlaceName,
            t.date,
            t.status,
            t.introduction,
            t.schedule,
            t.rules
          ))
          .sort(compareTournamentsByStatus);
      case 'clubs':
        return clubs.filter(c => {
          const linkedCoaches = [
            ...(coachesByClubId.get(c.id) || []),
            ...(c.coachIds || [])
              .map(coachId => coachById.get(coachId))
              .filter((coach): coach is Coach => Boolean(coach))
          ]
            .map(coach => [coach.id, coach.fullName]);
          return matchesSmartSearch(
            searchQuery,
            c.id,
            c.name,
            c.address,
            c.googleMapPlaceName,
            c.headCoach,
            c.coachIds,
            linkedCoaches,
            c.trainingDays,
            c.trainingHours,
            c.status ? 'hiển thị hoạt động' : 'ngừng hoạt động đang ẩn'
          );
        });
      case 'highlights':
        return highlights.filter(h => {
          const tournament = h.tournamentId ? tournamentById.get(h.tournamentId) : undefined;
          return matchesSmartSearch(
            searchQuery,
            h.id,
            h.title,
            h.athleteName,
            h.mediaType,
            h.tournamentId,
            h.tournamentName,
            tournament?.name,
            tournament?.date,
            tournament?.location,
            h.mediaNotes,
            h.status ? 'hiển thị hoạt động' : 'đang ẩn'
          );
        });
      default:
        return [];
    }
  };

  const renderedData = useMemo(
    () => getFilteredData(),
    [activeTab, searchQuery, articles, categories, coaches, members, achievements, tournaments, clubs, highlights]
  );
  const adminSearchOptions = useMemo(() => {
    switch (activeTab) {
      case 'articles':
        return articles.map(item => ({
          key: `article-${item.id}`,
          value: String(item.id),
          label: item.title,
          meta: `ID ${item.id} • ${item.date}`
        }));
      case 'categories':
        return categories.map(item => ({
          key: `category-${item.id}`,
          value: String(item.id),
          label: item.name,
          meta: `ID ${item.id} • Thứ tự ${item.order}`
        }));
      case 'coaches':
        return coaches.map(item => ({
          key: `coach-${item.id}`,
          value: String(item.id),
          label: item.fullName,
          meta: `${item.id} • ${item.rank} • ${item.birthYear}`
        }));
      case 'members':
        return members.map(item => ({
          key: `member-${item.id}`,
          value: String(item.id),
          label: item.fullName,
          meta: `${item.id} • ${item.rank} • ${item.birthYear}`
        }));
      case 'achievements':
        return buildTournamentSearchOptions(
          achievements,
          tournamentById,
          'achievement',
          'thành tích'
        );
      case 'tournaments':
        return tournaments.map(item => ({
          key: `tournament-${item.id}`,
          value: String(item.id),
          label: item.name,
          meta: `${item.id} • ${item.date} • ${item.status}`
        }));
      case 'clubs':
        return clubs.map(item => ({
          key: `club-${item.id}`,
          value: String(item.id),
          label: item.name,
          meta: `${item.id} • ${item.address}`
        }));
      case 'highlights':
        return buildTournamentSearchOptions(
          highlights,
          tournamentById,
          'highlight',
          'highlight'
        );
      default:
        return [];
    }
  }, [
    activeTab,
    articles,
    categories,
    coaches,
    members,
    achievements,
    tournaments,
    clubs,
    highlights,
    tournamentById,
    memberById,
    coachById
  ]);
  const adminAccountSearchOptions = useMemo(() => adminAccounts.map(account => ({
    key: `admin-${account.id}`,
    value: account.username,
    label: account.name,
    meta: `${account.username} • ${account.role === 'super' ? 'Admin chính' : 'Admin phụ'}`
  })), [adminAccounts]);
  const historySearchOptions = useMemo(() => editHistories.map(log => ({
    key: `history-${log.id}`,
    value: String(log.id),
    label: `${log.username} • ${log.action}`,
    meta: log.details
  })), [editHistories]);
  const [crudPage, setCrudPage] = useState(1);
  const CRUD_PAGE_SIZE = 25;
  const crudPageCount = Math.max(1, Math.ceil(renderedData.length / CRUD_PAGE_SIZE));
  const pagedRenderedData = useMemo(
    () => renderedData.slice((crudPage - 1) * CRUD_PAGE_SIZE, crudPage * CRUD_PAGE_SIZE),
    [crudPage, renderedData]
  );

  useEffect(() => {
    setCrudPage(1);
  }, [activeTab, searchQuery]);

  useEffect(() => {
    if (crudPage > crudPageCount) setCrudPage(crudPageCount);
  }, [crudPage, crudPageCount]);

  const isCrudTab = [
    'articles', 'categories', 'coaches', 'members', 'achievements', 'tournaments', 'clubs', 'highlights'
  ].includes(activeTab);

  // Render Login state if not authenticated
  if (!currentAdmin) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center px-4 py-16 bg-slate-100" id="admin-login-screen">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl border-2 border-slate-100 overflow-hidden">
          {/* Header Vovinam Brand Banner */}
          <div className="bg-[#0054A6] text-white p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-400/20 rounded-full blur-2xl"></div>
            <div className="w-16 h-16 bg-white rounded-full mx-auto flex items-center justify-center p-1.5 border-4 border-[#FFF200] shadow-md mb-3 transform hover:scale-105 transition-all">
              <Swords className="w-8 h-8 text-[#0054A6]" />
            </div>
            <h2 className="text-xl font-black uppercase italic tracking-tight text-[#FFF200]">Đăng nhập Ban Quản Trị</h2>
            <p className="text-[11px] text-blue-100 uppercase tracking-widest mt-1 font-bold">Hệ thống Vovinam Việt Võ Đạo</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="p-8 space-y-5">
            {loginError && (
              <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 animate-bounce">
                <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">Tên tài khoản</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input 
                  type="text" 
                  value={loginUsername}
                  onChange={e => setLoginUsername(e.target.value)}
                  placeholder="Nhập tên tài khoản..."
                  className="w-full text-sm pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#0054A6] focus:border-transparent transition-all outline-none font-semibold text-slate-800"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-black text-slate-500 uppercase tracking-wider">Mật khẩu</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                  <Lock className="w-4 h-4" />
                </span>
                <input 
                  type={showPassword ? "text" : "password"} 
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  placeholder="Nhập mật khẩu..."
                  className="w-full text-sm pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-[#0054A6] focus:border-transparent transition-all outline-none font-mono"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="rounded border-slate-300 text-[#0054A6] focus:ring-[#0054A6] w-4 h-4"
                />
                <span className="text-xs font-bold text-slate-600 group-hover:text-slate-800 select-none">Ghi nhớ đăng nhập</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full bg-[#0054A6] hover:bg-blue-800 active:scale-[0.98] text-white py-3.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg hover:shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 border-b-4 border-blue-900"
            >
              <Shield className="w-4 h-4 text-[#FFF200]" />
              <span>Đăng Nhập Quản Trị</span>
            </button>

            {onBackToWebsite && (
              <button
                type="button"
                onClick={onBackToWebsite}
                className="w-full bg-slate-100 hover:bg-slate-200 active:scale-[0.98] text-slate-700 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 border border-slate-200"
              >
                Quay lại website
              </button>
            )}
          </form>
        </div>
      </div>
    );
  }

  // Permitted tabs list for the sidebar
  const tabsList = ADMIN_CONTENT_TABS;

  // Filters out tabs that are not permitted for this admin (if they are assistant)
  const visibleTabs = tabsList.filter(tab => {
    if (currentAdmin.role === 'super') return true;
    return currentAdmin.permissions.includes(tab.id);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8" id="admin-panel-container">
      {/* Admin Top Status Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 text-[#0054A6] rounded-full flex items-center justify-center border border-blue-100">
            <UserCheck className="w-5 h-5 text-[#0054A6]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm">{currentAdmin.name}</h3>
              {currentAdmin.role === 'super' ? (
                <span className="bg-[#FFF200] text-[#0054A6] text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-yellow-400">
                  Admin chính
                </span>
              ) : (
                <span className="bg-indigo-50 text-indigo-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-indigo-100">
                  Admin phụ
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-medium">Tài khoản: <strong className="font-bold text-slate-600">{currentAdmin.username}</strong> • Trạng thái hoạt động: Liên kết nội bộ</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('changePassword')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'changePassword' 
                ? 'bg-amber-500 text-white shadow-md' 
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Đổi Mật Khẩu</span>
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 hover:bg-rose-100 active:scale-[0.98] text-rose-700 px-3.5 py-2 rounded-xl text-xs font-black uppercase transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* Left Sidebar Menu Navigation */}
        <aside className="lg:w-64 flex-shrink-0" id="admin-sidebar">
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-4">
            <div>
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2.5 px-2">Phân hệ chức năng</h3>
              <nav className="space-y-1">
                {visibleTabs.map(tab => {
                  const IconComp = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id as AdminTab); setIsEditing(false); }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        activeTab === tab.id ? 'bg-[#0054A6] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <IconComp className={`w-4 h-4 ${activeTab === tab.id ? 'text-[#FFF200]' : tab.color}`} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Super Admin Privileged Features (Manage Admins & Audit Logs) */}
            {currentAdmin.role === 'super' && (
              <div className="border-t pt-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2.5 px-2">Cơ sở dữ liệu & Bảo mật</h3>
                <nav className="space-y-1">
                  <button
                    onClick={() => { setActiveTab('admins'); setIsEditing(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'admins' ? 'bg-[#0054A6] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Shield className={`w-4 h-4 ${activeTab === 'admins' ? 'text-[#FFF200]' : 'text-indigo-600'}`} />
                    <span>Quản lý Admin phụ</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('history'); setIsEditing(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'history' ? 'bg-[#0054A6] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <History className={`w-4 h-4 ${activeTab === 'history' ? 'text-[#FFF200]' : 'text-amber-600'}`} />
                    <span>Lịch sử hệ thống</span>
                  </button>

                  <button
                    onClick={() => { setActiveTab('dbSync'); setIsEditing(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      activeTab === 'dbSync' ? 'bg-[#0054A6] text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle2 className={`w-4 h-4 ${activeTab === 'dbSync' ? 'text-[#FFF200]' : 'text-teal-600'}`} />
                    <span>Đồng bộ Cloud</span>
                  </button>
                </nav>
              </div>
            )}
          </div>
        </aside>

        {/* Admin Working Space */}
        <div className="flex-1" id="admin-main-stage">
          
          {/* Change Password View */}
          {activeTab === 'changePassword' && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200">
              <div className="flex items-center gap-2 mb-5 border-b pb-4">
                <Key className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-black text-[#0054A6] uppercase tracking-tight">Thay Đổi Mật Khẩu Cá Nhân</h2>
              </div>

              {passwordError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-600 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 mb-4 animate-shake">
                  <ShieldAlert className="w-4 h-4 flex-shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs font-bold flex items-center gap-2 mb-4">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <form onSubmit={handleChangePasswordSubmit} className="space-y-4 max-w-md">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Mật khẩu hiện tại</label>
                  <input 
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Nhập mật khẩu cũ..."
                    className="w-full text-sm border p-2.5 rounded-lg focus:ring-2 focus:ring-[#0054A6] outline-none transition-all font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Mật khẩu mới</label>
                  <input 
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự, có chữ và số..."
                    minLength={8}
                    className="w-full text-sm border p-2.5 rounded-lg focus:ring-2 focus:ring-[#0054A6] outline-none transition-all font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 uppercase">Xác nhận mật khẩu mới</label>
                  <input 
                    type="password"
                    value={confirmNewPassword}
                    onChange={e => setConfirmNewPassword(e.target.value)}
                    placeholder="Xác nhận lại mật khẩu mới..."
                    className="w-full text-sm border p-2.5 rounded-lg focus:ring-2 focus:ring-[#0054A6] outline-none transition-all font-mono"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="bg-[#0054A6] hover:bg-blue-800 text-white text-xs font-black uppercase px-6 py-2.5 rounded-xl cursor-pointer flex items-center gap-2 transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Lưu thay đổi</span>
                </button>
              </form>
            </div>
          )}

          {/* Manage Admin Accounts View (Super Admin Only) */}
          {activeTab === 'admins' && (
            <div className="space-y-6">
              {isEditingAdmin ? (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between border-b pb-4 mb-6">
                    <h3 className="text-base font-black text-[#0054A6] uppercase">
                      {editAdminId === null ? 'Cấp tài khoản Admin phụ mới' : 'Chỉnh sửa phân quyền Admin phụ'}
                    </h3>
                    <button 
                      onClick={() => setIsEditingAdmin(false)}
                      className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
                    >
                      <X className="w-5 h-5 text-slate-400" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveAdminAccount} className="space-y-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên hiển thị (Tên thật/Vị trí)</label>
                        <input 
                          type="text"
                          value={adminForm.name || ''}
                          onChange={e => setAdminForm({ ...adminForm, name: e.target.value })}
                          placeholder="Ví dụ: Huấn luyện viên Nguyễn Văn A"
                          className="w-full text-sm border p-2.5 rounded-lg outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên đăng nhập (Username)</label>
                        <input 
                          type="text"
                          value={adminForm.username || ''}
                          disabled={editAdminId !== null}
                          onChange={e => setAdminForm({ ...adminForm, username: e.target.value })}
                          placeholder="Ví dụ: assistant1"
                          className="w-full text-sm border p-2.5 rounded-lg disabled:bg-slate-50 outline-none"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                          {editAdminId === null ? 'Mật khẩu ban đầu' : 'Đặt mật khẩu mới (không bắt buộc)'}
                        </label>
                        <input 
                          type="password"
                          value={adminForm.password || ''}
                          onChange={e => setAdminForm({ ...adminForm, password: e.target.value })}
                          placeholder={editAdminId === null ? 'Tối thiểu 8 ký tự, có chữ và số' : 'Để trống nếu giữ mật khẩu hiện tại'}
                          className="w-full text-sm border p-2.5 rounded-lg font-mono outline-none"
                          required={editAdminId === null}
                          minLength={editAdminId === null ? 8 : undefined}
                          autoComplete="new-password"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vai trò</label>
                        <select
                          value={adminForm.role || 'assistant'}
                          onChange={e => setAdminForm({ ...adminForm, role: e.target.value as 'super' | 'assistant' })}
                          className="w-full text-sm border p-2.5 rounded-lg outline-none bg-white font-semibold"
                        >
                          <option value="assistant">Admin phụ (Phân quyền theo mục)</option>
                          <option value="super">Admin chính (Toàn quyền hệ thống)</option>
                        </select>
                      </div>
                    </div>

                    {/* Permissions Multi Checkbox List */}
                    <div className="space-y-2 border-t pt-4">
                      <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">Chỉ định các mục được phép quản lý (Phân quyền)</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {tabsList.map(tab => (
                          <label 
                            key={tab.id} 
                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer select-none transition-all ${
                              adminForm.permissions?.includes(tab.id) 
                                ? 'bg-blue-50/50 border-[#0054A6]/30 text-slate-900 font-bold' 
                                : 'bg-slate-50/50 border-slate-100 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <input 
                              type="checkbox"
                              checked={adminForm.permissions?.includes(tab.id) || false}
                              onChange={e => {
                                const currentPerms = adminForm.permissions || [];
                                if (e.target.checked) {
                                  setAdminForm({ ...adminForm, permissions: [...currentPerms, tab.id] });
                                } else {
                                  setAdminForm({ ...adminForm, permissions: currentPerms.filter(p => p !== tab.id) });
                                }
                              }}
                              className="rounded border-slate-300 text-[#0054A6] focus:ring-[#0054A6]"
                            />
                            <div className="flex items-center gap-1.5 text-xs">
                              {React.createElement(tab.icon, { className: "w-3.5 h-3.5 text-slate-400" })}
                              <span>{tab.label}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t">
                      <button 
                        type="button"
                        onClick={() => setIsEditingAdmin(false)}
                        className="px-5 py-2 border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button 
                        type="submit"
                        className="px-6 py-2 bg-[#0054A6] text-white rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer"
                      >
                        Lưu thông tin
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between border-b pb-4 mb-5">
                    <div>
                      <h2 className="text-base font-black text-[#0054A6] uppercase tracking-tight">Danh sách Admin Phụ & Phân Quyền</h2>
                      <p className="text-[10px] text-slate-400 mt-0.5">Quản lý, phân quyền cụ thể cho từng huấn luyện viên hoặc trợ lý trợ giảng phụ trách cập nhật website.</p>
                    </div>
                    <button
                      onClick={() => {
                        setAdminForm({ username: '', password: '', name: '', role: 'assistant', permissions: ['articles', 'members'] });
                        setEditAdminId(null);
                        setIsEditingAdmin(true);
                      }}
                      className="flex items-center gap-1.5 bg-[#0054A6] hover:bg-blue-800 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Cấp tài khoản mới</span>
                    </button>
                  </div>

                  {/* Search input for admin accounts */}
                  <SmartSearchInput
                    value={searchQuery}
                    onChange={setSearchQuery}
                    options={adminAccountSearchOptions}
                    placeholder="Tìm tài khoản theo ID, tên, tên đăng nhập hoặc quyền..."
                    ariaLabel="Tìm kiếm tài khoản quản trị"
                    resultCount={adminAccounts.filter(account => matchesSmartSearch(
                      searchQuery,
                      account.id,
                      account.name,
                      account.username,
                      account.role,
                      account.permissions
                    )).length}
                    helperText="Bấm mũi tên để xem toàn bộ tài khoản."
                    theme="admin"
                    className="mb-5"
                  />

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-400 uppercase tracking-wider font-extrabold border-b">
                          <th className="p-3">Tên hiển thị</th>
                          <th className="p-3">Tài khoản</th>
                          <th className="p-3">Bảo mật</th>
                          <th className="p-3">Vai trò</th>
                          <th className="p-3">Mục được phép quản lý</th>
                          <th className="p-3 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y text-slate-600">
                        {adminAccounts
                          .filter(acc => matchesSmartSearch(
                            searchQuery,
                            acc.id,
                            acc.name,
                            acc.username,
                            acc.role === 'super' ? 'admin chính' : 'admin phụ',
                            acc.permissions
                          ))
                          .map(acc => (
                            <tr key={acc.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3 font-bold text-slate-800">{acc.name}</td>
                              <td className="p-3 font-mono text-slate-500">{acc.username}</td>
                              <td className="p-3">
                                <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2.5 py-1 rounded border border-emerald-100 block w-max">
                                  {acc.hasPassword ? 'Đã bảo vệ' : 'Cần đặt mật khẩu'}
                                </span>
                              </td>
                              <td className="p-3">
                                {acc.role === 'super' ? (
                                  <span className="bg-[#FFF200] text-[#0054A6] font-black text-[9px] uppercase px-2 py-1 rounded">Admin chính</span>
                                ) : (
                                  <span className="bg-indigo-50 text-indigo-700 font-bold text-[9px] uppercase px-2 py-1 rounded">Admin phụ</span>
                                )}
                              </td>
                              <td className="p-3">
                                {acc.role === 'super' ? (
                                  <span className="text-[10px] font-bold text-slate-400 italic">Toàn bộ quyền hệ thống</span>
                                ) : acc.permissions && acc.permissions.length > 0 ? (
                                  <div className="flex flex-wrap gap-1 max-w-sm">
                                    {acc.permissions.map(perm => {
                                      const matched = tabsList.find(t => t.id === perm);
                                      return (
                                        <span key={perm} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[9px] font-medium">
                                          {matched ? matched.label.replace('Quản lý ', '') : perm}
                                        </span>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-rose-500 italic font-bold">Chưa phân quyền (Bị khóa)</span>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                {acc.username !== 'admin' ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => {
                                        setAdminForm({ ...acc, password: '' });
                                        setEditAdminId(acc.id);
                                        setIsEditingAdmin(true);
                                      }}
                                      className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-all cursor-pointer"
                                      title="Sửa phân quyền"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteAdmin(acc.id, acc.username)}
                                      className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all cursor-pointer"
                                      title="Xóa tài khoản"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-400 italic">Mặc định</span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* System Logs Audit Trail View (Super Admin Only) */}
          {activeTab === 'history' && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 mb-5">
                <div>
                  <h2 className="text-base font-black text-[#0054A6] uppercase tracking-tight">Nhật Ký Hành Động & Lịch Sử Hệ Thống</h2>
                  <p className="text-[10px] text-slate-400 mt-0.5">Theo dõi lịch sử thêm, sửa, xóa thông tin chi tiết trên hệ thống của toàn bộ tài khoản Admin chính và phụ.</p>
                </div>
                <button
                  onClick={() => {
                    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử hành động? Thao tác này không thể hoàn tác!')) {
                      const resetLog: EditHistory[] = [
                        {
                          id: Date.now(),
                          timestamp: new Date().toISOString(),
                          username: currentAdmin.username,
                          role: currentAdmin.role,
                          action: 'Dọn dẹp nhật ký',
                          tab: 'history',
                          details: 'Đã thực hiện dọn dẹp toàn bộ dữ liệu nhật ký hệ thống.'
                        }
                      ];
                      setEditHistories(resetLog);
                      localStorage.setItem('vovinam_edit_histories', JSON.stringify(resetLog));
                    }
                  }}
                  className="bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-bold px-4 py-2 rounded-xl transition-all border border-slate-200 cursor-pointer"
                >
                  Dọn sạch lịch sử
                </button>
              </div>

              {/* Search bar for audit logs */}
              <SmartSearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                options={historySearchOptions}
                placeholder="Tìm lịch sử theo tài khoản, hành động, phân hệ hoặc nội dung..."
                ariaLabel="Tìm kiếm lịch sử quản trị"
                resultCount={editHistories.filter(log => matchesSmartSearch(
                  searchQuery,
                  log.id,
                  log.timestamp,
                  log.username,
                  log.action,
                  log.tab,
                  log.details
                )).length}
                helperText="Bấm mũi tên để xem toàn bộ lịch sử thao tác."
                theme="admin"
                className="mb-5"
              />

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 uppercase tracking-wider font-extrabold border-b">
                      <th className="p-3 w-40">Thời gian</th>
                      <th className="p-3">Tài khoản</th>
                      <th className="p-3">Hành động</th>
                      <th className="p-3">Mục phân hệ</th>
                      <th className="p-3">Nội dung chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y text-slate-600 font-medium">
                    {(() => {
                      const filteredLogs = editHistories.filter(log => {
                        return matchesSmartSearch(
                          searchQuery,
                          log.id,
                          log.timestamp,
                          log.username,
                          log.action,
                          log.tab,
                          log.details
                        );
                      });

                      if (filteredLogs.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="p-6 text-center text-slate-400 italic">Không tìm thấy lịch sử hành động phù hợp với từ khóa.</td>
                          </tr>
                        );
                      }

                      return filteredLogs.map(log => {
                        const formattedTime = new Date(log.timestamp).toLocaleString('vi-VN', {
                          year: 'numeric',
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit'
                        });
                        return (
                          <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 font-mono text-slate-400 text-[10.5px]">{formattedTime}</td>
                            <td className="p-3">
                              <span className="font-bold text-slate-800 block">{log.username}</span>
                              <span className="text-[9px] uppercase font-black text-slate-400 font-mono">
                                {log.role === 'super' ? 'Admin chính' : 'Admin phụ'}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[9.5px] font-black uppercase ${
                                log.action === 'Thêm' ? 'bg-emerald-100 text-emerald-800' :
                                log.action === 'Xóa' ? 'bg-rose-100 text-rose-800' :
                                log.action === 'Sửa' ? 'bg-blue-100 text-blue-800 font-bold' :
                                log.action === 'Đăng nhập' ? 'bg-amber-100 text-amber-800' :
                                'bg-slate-100 text-slate-700'
                              }`}>
                                {log.action}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className="font-mono text-[10.5px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{log.tab}</span>
                            </td>
                            <td className="p-3 text-slate-700 font-semibold">{log.details}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Quick Notice - Only shown for Super Admin */}
          {activeTab !== 'changePassword' && activeTab !== 'admins' && activeTab !== 'history' && currentAdmin?.role === 'super' && (
            <div className="bg-blue-50 border-l-4 border-[#0054A6] p-4 rounded-xl mb-6 text-xs text-blue-800 flex gap-2 items-center">
              <CheckCircle2 className="w-4 h-4 text-[#0054A6]" />
              <p>
                <strong>Hệ thống quản trị thời gian thực:</strong> Bạn đang cập nhật dữ liệu với tài khoản <strong>{currentAdmin.name}</strong>. Mọi thay đổi sẽ lập tức đồng bộ hóa ra Trang chủ môn sinh và được ghi nhận đầy đủ vào lịch sử hệ thống.
              </p>
            </div>
          )}

          {currentAdmin?.role === 'super' && backupStatus?.available && (
            <div className={`mb-6 rounded-xl border-l-4 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              backupStatus.needsBackup
                ? 'bg-amber-50 border-amber-500 text-amber-900'
                : 'bg-emerald-50 border-emerald-500 text-emerald-900'
            }`}>
              <div className="text-xs">
                <div className="font-black uppercase tracking-wide">
                  {backupStatus.needsBackup
                    ? '⚠ Dữ liệu mới hơn bản sao lưu toàn bộ gần nhất'
                    : '✓ Dữ liệu đã có bản sao lưu toàn bộ an toàn'}
                </div>
                <div className="mt-1 opacity-80">
                  Hệ thống vẫn giữ {backupStatus.retentionSlots || 5} phiên bản tự động cho từng mục.
                  {backupStatus.lastFullBackupAt > 0 && (
                    <> Bản toàn bộ gần nhất: {new Date(backupStatus.lastFullBackupAt).toLocaleString('vi-VN')}.</>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCreateCloudBackup}
                disabled={isCreatingBackup}
                className="shrink-0 rounded-xl bg-[#0054A6] px-4 py-2.5 text-xs font-black text-white shadow hover:bg-blue-800 disabled:opacity-50"
              >
                {isCreatingBackup ? 'Đang sao lưu...' : 'Sao lưu Cloud ngay'}
              </button>
            </div>
          )}

          {/* If managing WebConfig, display dedicated Settings view */}
          {activeTab === 'webConfig' && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 animate-in fade-in duration-200">
              <h2 className="text-lg font-black text-[#0054A6] uppercase tracking-tight mb-6">Quản lý Cấu hình Website</h2>

              {/* BACKUP & RESTORE DATA CONTROLS */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-4 sm:p-5 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-xs font-black text-[#0054A6] uppercase tracking-wider flex items-center gap-1.5">
                      <span>📦 HỆ THỐNG SAO LƯU & CHIA SẺ DỮ LIỆU</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xl">
                      Do dữ liệu chạy thử nghiệm được lưu trực tiếp trên trình duyệt của bạn (Local Storage), bạn có thể xuất toàn bộ nội dung của mình thành File sao lưu để gửi cho người khác hoặc nhập vào thiết bị khác để hiển thị đồng bộ!
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    {/* Export */}
                    <button
                      type="button"
                      onClick={() => {
                        try {
                          downloadLocalBackup();
                          
                          addLog('Sao lưu', 'system', 'Đã xuất file sao lưu dữ liệu (.json)');
                          showToast('Đã tải xuống file sao lưu dữ liệu thành công!', 'success');
                        } catch (err) {
                          showToast('Không thể xuất file sao lưu!', 'error');
                        }
                      }}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm cursor-pointer"
                    >
                      <span>📥 Xuất Sao Lưu (JSON)</span>
                    </button>

                    {/* Import */}
                    <label className={`flex items-center gap-1.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-sm ${
                      isImportingBackup
                        ? 'cursor-not-allowed opacity-60'
                        : 'cursor-pointer hover:bg-slate-50'
                    }`}>
                      <input
                        type="file"
                        accept=".json"
                        onChange={(e) => {
                          if (isImportingBackup) {
                            e.target.value = '';
                            return;
                          }
                          const file = e.target.files?.[0];
                          if (!file) return;
                          
                          if (confirm('Khôi phục dữ liệu sẽ ghi đè và thay thế toàn bộ danh mục, thành viên, bài viết hiện tại. Bạn có chắc chắn muốn khôi phục không?')) {
                            setIsImportingBackup(true);
                            showToast('Đang sao lưu Cloud và khôi phục dữ liệu. Vui lòng không tải lại trang...', 'info');
                            const reader = new FileReader();
                            reader.onload = async (event) => {
                              try {
                                const parsed = JSON.parse(event.target?.result as string);
                                const normalizedBackup = await externalizeInlineImages(parsed);
                                const restoreRes = await fetch('/api/restore-backup', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ backup: normalizedBackup })
                                });
                                const restorePayload = await restoreRes.json().catch(() => ({}));
                                if (!restoreRes.ok || !restorePayload.success) {
                                  const partial = Array.isArray(restorePayload.restoredKeys) &&
                                    restorePayload.restoredKeys.length > 0
                                    ? ` Đã lưu được: ${restorePayload.restoredKeys.join(', ')}.`
                                    : '';
                                  throw new Error(
                                    `${restorePayload.message || restorePayload.error || 'Không thể khôi phục dữ liệu.'}${partial}`
                                  );
                                }

                                if (applyCloudSnapshot && restorePayload.data) {
                                  applyCloudSnapshot(restorePayload.data);
                                } else {
                                  window.location.reload();
                                  return;
                                }

                                addLog(
                                  'Khôi phục',
                                  'system',
                                  `Đã khôi phục tuần tự từ file .json: ${restorePayload.restoredKeys.join(', ')}`
                                );
                                showToast('Đã sao lưu an toàn và khôi phục dữ liệu thành công!', 'success');
                                
                                // Reset file input
                                e.target.value = '';
                              } catch (err) {
                                showToast(
                                  err instanceof Error
                                    ? err.message
                                    : 'File sao lưu không đúng định dạng JSON hợp lệ!',
                                  'error'
                                );
                              } finally {
                                setIsImportingBackup(false);
                                e.target.value = '';
                              }
                            };
                            reader.onerror = () => {
                              setIsImportingBackup(false);
                              e.target.value = '';
                              showToast('Không thể đọc file JSON đã chọn.', 'error');
                            };
                            reader.readAsText(file);
                          } else {
                            e.target.value = '';
                          }
                        }}
                        className="hidden"
                      />
                      <span>{isImportingBackup ? '⏳ Đang khôi phục...' : '📤 Nhập Sao Lưu (.json)'}</span>
                    </label>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên CLB</label>
                    <input 
                      type="text" 
                      value={webConfigForm.clbName}
                      onChange={e => setWebConfigForm({ ...webConfigForm, clbName: e.target.value })}
                      className="w-full text-sm border p-2 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Logo website (Tải từ máy hoặc nhập URL)</label>
                    <div className="space-y-1.5">
                      <input 
                        type="text" 
                        value={webConfigForm.logo}
                        onChange={e => setWebConfigForm({ ...webConfigForm, logo: e.target.value })}
                        placeholder="Nhập đường dẫn URL hoặc chọn từ máy ở dưới..."
                        className="w-full text-xs border p-2 rounded-lg"
                      />
                      <div className="flex items-center gap-2">
                        <label className="flex-grow flex items-center justify-center border border-dashed border-[#0054A6]/30 hover:border-[#0054A6] rounded-lg py-1.5 px-3 text-[11px] font-bold text-[#0054A6] cursor-pointer bg-[#0054A6]/5 hover:bg-[#0054A6]/10 transition-colors">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                try {
                                  const uploadedLogo = await compressAndUploadHighlightImage(file);
                                  setWebConfigForm(previous => ({ ...previous, logo: uploadedLogo }));
                                  showToast('Đã nén và tải logo lên kho ảnh.', 'success');
                                } catch (error) {
                                  showToast(
                                    error instanceof Error ? error.message : 'Không thể tải logo lên kho ảnh.',
                                    'error'
                                  );
                                }
                              }
                            }}
                            className="hidden" 
                          />
                          <span>Chọn ảnh từ máy tính 📁</span>
                        </label>
                        {webConfigForm.logo && (
                          <div className="w-12 h-12 rounded-full flex-shrink-0 bg-[#0054A6] p-[1px] ring-2 ring-[#FFF200]">
                            <img
                              src={webConfigForm.logo}
                              alt="Logo preview"
                              className="block w-full h-full object-contain"
                              width={1024}
                              height={1024}
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Nên dùng PNG vuông tối thiểu 800×800 px để logo rõ trên màn hình Retina.
                      </p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Địa chỉ chính</label>
                    <input 
                      type="text" 
                      value={webConfigForm.address}
                      onChange={e => setWebConfigForm({ ...webConfigForm, address: e.target.value })}
                      className="w-full text-sm border p-2 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Điện thoại</label>
                    <input 
                      type="text" 
                      value={webConfigForm.phone}
                      onChange={e => setWebConfigForm({ ...webConfigForm, phone: e.target.value })}
                      className="w-full text-sm border p-2 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                    <input 
                      type="email" 
                      value={webConfigForm.email}
                      onChange={e => setWebConfigForm({ ...webConfigForm, email: e.target.value })}
                      className="w-full text-sm border p-2 rounded-lg"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Link Facebook</label>
                    <input 
                      type="text" 
                      value={webConfigForm.facebook}
                      onChange={e => setWebConfigForm({ ...webConfigForm, facebook: e.target.value })}
                      placeholder="https://facebook.com/ten-trang-clb"
                      className="w-full text-sm border p-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Link Instagram</label>
                    <input 
                      type="text" 
                      value={webConfigForm.instagram}
                      onChange={e => setWebConfigForm({ ...webConfigForm, instagram: e.target.value })}
                      placeholder="https://instagram.com/ten_tai_khoan"
                      className="w-full text-sm border p-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Link Threads</label>
                    <input 
                      type="text" 
                      value={webConfigForm.threads}
                      onChange={e => setWebConfigForm({ ...webConfigForm, threads: e.target.value })}
                      placeholder="https://threads.net/@ten_tai_khoan"
                      className="w-full text-sm border p-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Link Tiktok</label>
                    <input 
                      type="text" 
                      value={webConfigForm.tiktok}
                      onChange={e => setWebConfigForm({ ...webConfigForm, tiktok: e.target.value })}
                      placeholder="https://tiktok.com/@ten_tai_khoan"
                      className="w-full text-sm border p-2 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SEO Title</label>
                    <input 
                      type="text" 
                      value={webConfigForm.seoTitle}
                      onChange={e => setWebConfigForm({ ...webConfigForm, seoTitle: e.target.value })}
                      className="w-full text-sm border p-2 rounded-lg"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">SEO Description</label>
                  <textarea 
                    value={webConfigForm.seoDescription}
                    onChange={e => setWebConfigForm({ ...webConfigForm, seoDescription: e.target.value })}
                    rows={2}
                    className="w-full text-sm border p-2 rounded-lg"
                  />
                </div>

                {/* DYNAMIC HERO CAROUSEL BANNERS MANAGEMENT */}
                <div className="border-t border-slate-200 pt-6 mt-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
                    <div>
                      <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Quản Lý Banner Động (Hero Carousel)</h3>
                      <p className="text-[11px] text-slate-500">Các ảnh lớn chạy tự động ở đầu trang chủ của website. Căn chỉnh tỉ lệ trực quan trước khi lưu.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingBanner(true);
                        setEditingBannerId(null);
                        setBannerForm({
                          id: Date.now().toString(),
                          image: '',
                          title: '',
                          subtitle: '',
                          alignmentPct: 50
                        });
                      }}
                      className="flex items-center gap-1.5 bg-[#0054A6]/10 hover:bg-[#0054A6]/20 text-[#0054A6] text-xs font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Thêm Banner Mới</span>
                    </button>
                  </div>

                  {/* BANNER HEIGHT & SIZE SELECTION */}
                  <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Chiều cao / Kích thước hiển thị Banner</label>
                      <p className="text-[11px] text-slate-500">Thay đổi tỉ lệ khung hình (Aspect Ratio) của toàn bộ các slide hiển thị ngoài trang chủ.</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'short', label: 'Thấp (Compact)', desc: 'h-[400px]' },
                        { id: 'medium', label: 'Vừa (Cân đối)', desc: 'h-[500px]' },
                        { id: 'large', label: 'Cao (Hùng vĩ)', desc: 'h-[600px]' },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setWebConfigForm({
                            ...webConfigForm,
                            bannerHeight: item.id as 'short' | 'medium' | 'large'
                          })}
                          className={`border rounded-xl p-2 text-center transition-all cursor-pointer ${
                            (webConfigForm.bannerHeight || 'medium') === item.id
                              ? 'border-[#0054A6] bg-blue-50 text-[#0054A6] ring-2 ring-blue-100 font-bold'
                              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                          }`}
                        >
                          <div className="text-xs">{item.label}</div>
                          <div className="text-[9px] opacity-70 mt-0.5">{item.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* REAL-TIME CAROUSEL MULTI-BANNER LIVE PREVIEW */}
                  <div className="mb-6 bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-6 relative text-white">
                    <div className="flex items-center justify-between gap-2 mb-4 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#FFF200] animate-pulse"></span>
                        <h4 className="text-xs font-black uppercase tracking-wider text-[#FFF200]">
                          💻 XEM TRƯỚC CAROUSEL TRANG CHỦ (LIVE PREVIEW)
                        </h4>
                      </div>
                      <span className="text-[10px] bg-slate-800 px-2.5 py-1 rounded text-slate-400 font-mono">
                        {(webConfigForm.banners || []).length > 0 
                          ? `Slide ${Math.min(previewBannerIndex + 1, (webConfigForm.banners || []).length)} / ${(webConfigForm.banners || []).length}`
                          : '0 / 0 Banners'
                        }
                      </span>
                    </div>

                    {/* Sliding Mockup Window */}
                    {(webConfigForm.banners || []).length === 0 ? (
                      <div className="h-[200px] flex flex-col items-center justify-center text-slate-500 bg-slate-950 rounded-xl border border-dashed border-slate-800">
                        <span className="text-3xl mb-1">🖼️</span>
                        <p className="text-xs font-bold">Chưa có banner tùy chọn nào được thêm.</p>
                        <p className="text-[10px] text-slate-500 mt-1">Hệ thống đang hiển thị 5 slide mặc định của võ đường.</p>
                      </div>
                    ) : (
                      (() => {
                        const activeBns = webConfigForm.banners || [];
                        const safeIdx = previewBannerIndex >= activeBns.length ? 0 : previewBannerIndex;
                        const activeBn = activeBns[safeIdx];
                        
                        // Parse alignment percentage
                        let alignment = 50;
                        const match = activeBn?.position?.match(/object-\[center_(\d+)%\]/);
                        if (match) {
                          alignment = parseInt(match[1]);
                        }

                        // Determine height depending on bannerHeight selection
                        const configHeight = webConfigForm.bannerHeight || 'medium';
                        const previewAspectClass = getBannerPreviewAspectClass(configHeight);

                        const handleDragStart = (clientY: number) => {
                          setIsDraggingY(true);
                          setDragStartY(clientY);
                          setDragStartPct(alignment);
                        };

                        const handleDragMove = (clientY: number, containerHeight: number) => {
                          if (!isDraggingY) return;
                          const deltaY = clientY - dragStartY;
                          // Standardize sensitivity
                          const pctChange = Math.round((deltaY / containerHeight) * 120);
                          let newPct = dragStartPct - pctChange;
                          if (newPct < 0) newPct = 0;
                          if (newPct > 100) newPct = 100;

                          // Update inside the webConfigForm array
                          const updatedBanners = [...(webConfigForm.banners || [])];
                          if (updatedBanners[safeIdx]) {
                            updatedBanners[safeIdx] = {
                              ...updatedBanners[safeIdx],
                              position: `object-[center_${newPct}%]`
                            };
                            setWebConfigForm({
                              ...webConfigForm,
                              banners: updatedBanners
                            });
                          }
                        };

                        return (
                          <div className="relative">
                            {/* Drag Tip */}
                            <div className="absolute top-2 left-2 z-30 bg-black/70 border border-slate-700/60 text-slate-300 text-[9px] px-2 py-0.5 rounded-lg flex items-center gap-1 font-semibold pointer-events-none">
                              <span className="animate-bounce">↕</span>
                              <span>Nhấp & kéo thả trực tiếp trên ảnh để dời tiêu điểm đứng (Y-axis)</span>
                            </div>

                            <div 
                              className={`w-full ${previewAspectClass} rounded-xl overflow-hidden relative bg-slate-950 shadow-2xl flex flex-col justify-between cursor-ns-resize select-none border border-slate-800 transition-all`}
                              onMouseDown={(e) => handleDragStart(e.clientY)}
                              onMouseMove={(e) => handleDragMove(e.clientY, e.currentTarget.clientHeight)}
                              onMouseUp={() => setIsDraggingY(false)}
                              onMouseLeave={() => setIsDraggingY(false)}
                              onTouchStart={(e) => {
                                const touch = e.touches[0];
                                if (touch) handleDragStart(touch.clientY);
                              }}
                              onTouchMove={(e) => {
                                const touch = e.touches[0];
                                if (touch) handleDragMove(touch.clientY, e.currentTarget.clientHeight);
                              }}
                              onTouchEnd={() => setIsDraggingY(false)}
                            >
                              {/* Background Image */}
                              {activeBn?.image ? (
                                <img
                                  src={resolveAdminBannerImage(activeBn.image)}
                                  alt="Preview Slide"
                                  className="absolute inset-0 w-full h-full object-cover pointer-events-none transition-all duration-150"
                                  style={{ objectPosition: `center ${alignment}%` }}
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-500">
                                  <span>Ảnh lỗi hoặc chưa có ảnh</span>
                                </div>
                              )}

                              {/* Overlays */}
                              <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/35 to-black/80 pointer-events-none"></div>

                              {/* Content Overlay */}
                              <div className="relative z-10 w-full h-full flex flex-col justify-start pt-5 px-4 text-center text-white pointer-events-none">
                                <div className="inline-flex items-center gap-1 bg-[#0054A6]/95 text-[#FFF200] text-[7.5px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider mb-1.5 border border-[#FFF200]/25 mx-auto">
                                  <span className="w-1 h-1 rounded-full bg-[#FFF200] animate-ping"></span>
                                  <span>Môn Phái Việt Võ Đạo</span>
                                </div>
                                
                                <h2 className="text-xs sm:text-sm font-black text-[#FFF200] uppercase tracking-tight italic mb-1 drop-shadow-md">
                                  {activeBn?.title || "CHƯA NHẬP TIÊU ĐỀ"}
                                </h2>
                                <p className="text-[9px] text-slate-100 font-medium leading-tight max-w-xs mx-auto opacity-95 line-clamp-2 drop-shadow">
                                  {activeBn?.subtitle || "Mô tả phụ cho banner."}
                                </p>

                                <div className="mt-2.5 flex gap-1.5 justify-center">
                                  <span className="bg-[#FFF200] text-[#0054A6] px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider">
                                    Khám phá
                                  </span>
                                  <span className="bg-white/10 text-white border border-white/15 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider">
                                    Thư viện
                                  </span>
                                </div>
                              </div>

                              {/* Dragging Overlay Status */}
                              {isDraggingY && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none z-20">
                                  <div className="bg-[#0054A6] text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wider flex items-center gap-1 border border-[#FFF200]/40 shadow-xl animate-pulse">
                                    <span>↕ Đang dời:</span>
                                    <span className="text-[#FFF200]">{alignment}%</span>
                                  </div>
                                </div>
                              )}

                              {/* Indicators at Bottom inside the slide mockup */}
                              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 pointer-events-none">
                                {activeBns.map((_, idx) => (
                                  <span 
                                    key={idx} 
                                    className={`rounded-full transition-all ${idx === safeIdx ? 'w-4 h-1 bg-[#FFF200]' : 'w-1.5 h-1 bg-white/30'}`}
                                  ></span>
                                ))}
                              </div>
                            </div>

                            {/* Navigation Arrows for Preview */}
                            <button
                              type="button"
                              onClick={() => setPreviewBannerIndex((prev) => (prev - 1 + activeBns.length) % activeBns.length)}
                              className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 bg-black/55 hover:bg-[#0054A6] text-white p-1.5 rounded-full border border-slate-700/50 hover:text-[#FFF200] transition-colors cursor-pointer"
                              title="Banner trước"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setPreviewBannerIndex((prev) => (prev + 1) % activeBns.length)}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 bg-black/55 hover:bg-[#0054A6] text-white p-1.5 rounded-full border border-slate-700/50 hover:text-[#FFF200] transition-colors cursor-pointer"
                              title="Banner sau"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })()
                    )}
                  </div>

                  {/* Banner Add/Edit form overlay or box if open */}
                  {(isAddingBanner || editingBannerId) && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 sm:p-5 mb-6 space-y-4 relative animate-in slide-in-from-top-4 duration-200">
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingBanner(false);
                          setEditingBannerId(null);
                        }}
                        className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1 bg-white hover:bg-slate-100 rounded-full border shadow-xs"
                      >
                        <X className="w-4 h-4" />
                      </button>

                      <h4 className="text-xs font-black text-[#0054A6] uppercase tracking-wider">
                        {isAddingBanner ? '✨ Thêm Banner Mới' : '📝 Chỉnh Sửa Banner'}
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Left Side: Inputs */}
                        <div className="space-y-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Tiêu đề Banner</label>
                            <input
                              type="text"
                              value={bannerForm.title}
                              onChange={e => setBannerForm({ ...bannerForm, title: e.target.value })}
                              placeholder="VD: Vinh Quang Việt Võ Đạo..."
                              className="w-full text-xs border p-2 rounded-lg bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Mô tả ngắn</label>
                            <textarea
                              value={bannerForm.subtitle}
                              onChange={e => setBannerForm({ ...bannerForm, subtitle: e.target.value })}
                              placeholder="VD: Nhiều huy chương vàng đạt được tại các giải trẻ toàn quốc..."
                              rows={2}
                              className="w-full text-xs border p-2 rounded-lg bg-white"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Đường dẫn ảnh (URL hoặc tải lên)</label>
                            <input
                              type="text"
                              value={bannerForm.image}
                              onChange={e => setBannerForm({ ...bannerForm, image: e.target.value })}
                              placeholder="Nhập đường dẫn URL ảnh hoặc chọn file ở dưới..."
                              className="w-full text-xs border p-2 rounded-lg bg-white mb-2"
                            />
                            <label className="flex items-center justify-center border border-dashed border-[#0054A6]/30 hover:border-[#0054A6] rounded-lg py-1.5 px-3 text-[11px] font-bold text-[#0054A6] cursor-pointer bg-[#0054A6]/5 hover:bg-[#0054A6]/10 transition-colors">
                              <input 
                                type="file" 
                                accept="image/*"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    // Compress image before saving if it is too big
                                    const reader = new FileReader();
                                    reader.onloadend = () => {
                                      if (typeof reader.result === 'string') {
                                        const img = new Image();
                                        img.onload = async () => {
                                          // Keep a high-resolution source and only reduce it when
                                          // required by the cloud image-size limit.
                                          const canvas = document.createElement('canvas');
                                          const scale = Math.min(
                                            1,
                                            2200 / img.width,
                                            1400 / img.height
                                          );
                                          const width = Math.max(1, Math.round(img.width * scale));
                                          const height = Math.max(1, Math.round(img.height * scale));
                                          
                                          canvas.width = width;
                                          canvas.height = height;
                                          const ctx = canvas.getContext('2d');
                                          if (ctx) {
                                            ctx.imageSmoothingEnabled = true;
                                            ctx.imageSmoothingQuality = 'high';
                                            ctx.drawImage(img, 0, 0, width, height);
                                            try {
                                              const bannerBlob = await encodeCanvasForStorage(canvas);
                                              const uploadedBanner = await uploadHighlightImageDataUrl(
                                                await blobToDataUrl(bannerBlob)
                                              );
                                              setBannerForm(prev => ({ ...prev, image: uploadedBanner }));
                                              showToast('Đã tải banner chất lượng cao lên kho ảnh.', 'success');
                                            } catch (error) {
                                              showToast(
                                                error instanceof Error ? error.message : 'Không thể tải banner lên kho ảnh.',
                                                'error'
                                              );
                                            }
                                          } else {
                                            setBannerForm(prev => ({ ...prev, image: reader.result as string }));
                                          }
                                        };
                                        img.src = reader.result;
                                      }
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                                className="hidden" 
                              />
                              <span>Tải ảnh từ máy & Tự động nén dung lượng 📁</span>
                            </label>
                          </div>

                          <div>
                            <div className="flex justify-between items-center mb-1">
                              <label className="block text-[11px] font-bold text-slate-500 uppercase">Căn chỉnh dọc hình ảnh (Y-axis)</label>
                              <span className="text-xs font-black text-[#0054A6]">{bannerForm.alignmentPct}%</span>
                            </div>
                            <input
                              type="range"
                              min="0"
                              max="100"
                              value={bannerForm.alignmentPct}
                              onChange={e => setBannerForm({ ...bannerForm, alignmentPct: parseInt(e.target.value) })}
                              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-[#0054A6]"
                            />
                            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                              <span>0% (Đỉnh ảnh)</span>
                              <span>50% (Chính giữa)</span>
                              <span>100% (Đáy ảnh)</span>
                            </div>
                          </div>
                        </div>

                        {/* Right Side: LIVE PREVIEW SINGLE */}
                        <div className="flex flex-col h-full">
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1 flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5 text-[#0054A6]" />
                            <span>XEM TRƯỚC SƠ BỘ SLIDE</span>
                          </label>
                          
                          <div className={`w-full ${getBannerPreviewAspectClass(webConfigForm.bannerHeight || 'medium')} border border-slate-300 rounded-xl overflow-hidden relative bg-slate-900 flex flex-col justify-between shadow-inner select-none`}>
                            {bannerForm.image ? (
                              <img
                                src={resolveAdminBannerImage(bannerForm.image)}
                                alt="Single Preview Background"
                                className="absolute inset-0 w-full h-full object-cover"
                                style={{ objectPosition: `center ${bannerForm.alignmentPct}%` }}
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500 bg-slate-950 p-4 text-center">
                                <span className="text-2xl">🖼️</span>
                                <span className="text-[10px] mt-1 font-bold">Chưa có ảnh. Tải ảnh lên để căn chỉnh</span>
                              </div>
                            )}

                            <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/40 to-black/70 pointer-events-none"></div>

                            {/* Content Mockup */}
                            <div className="relative z-10 w-full h-full flex flex-col justify-start pt-6 px-4 text-center text-white pointer-events-none">
                              <h2 className="text-xs sm:text-sm font-black text-[#FFF200] uppercase tracking-tight italic mb-1">
                                {bannerForm.title || "TIÊU ĐỀ BANNER MOCKUP"}
                              </h2>
                              <p className="text-[9px] text-slate-100 font-medium leading-tight line-clamp-2">
                                {bannerForm.subtitle || "Mô tả ngắn của slide."}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingBanner(false);
                            setEditingBannerId(null);
                          }}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold px-4 py-1.5 rounded-lg cursor-pointer"
                        >
                          Hủy bỏ
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!bannerForm.image) {
                              alert('Vui lòng thêm hình ảnh cho banner!');
                              return;
                            }
                            // Save or Add Banner inside local form state
                            const currentBanners = [...(webConfigForm.banners || [])];
                            const updatedBannerItem = {
                              id: bannerForm.id || Date.now().toString(),
                              image: bannerForm.image,
                              title: bannerForm.title || 'Tiêu Đề Banner',
                              subtitle: bannerForm.subtitle || '',
                              position: `object-[center_${bannerForm.alignmentPct}%]`
                            };

                            if (editingBannerId) {
                              // Update
                              const idx = currentBanners.findIndex(b => b.id === editingBannerId);
                              if (idx !== -1) {
                                currentBanners[idx] = updatedBannerItem;
                              }
                            } else {
                              // Add
                              currentBanners.push(updatedBannerItem);
                            }

                            setWebConfigForm({
                              ...webConfigForm,
                              banners: currentBanners
                            });
                            setIsAddingBanner(false);
                            setEditingBannerId(null);
                          }}
                          className="bg-[#0054A6] hover:bg-blue-800 text-white text-xs font-bold px-4 py-1.5 rounded-lg cursor-pointer"
                        >
                          {editingBannerId ? 'Cập Nhật Banner' : 'Xác Nhận Thêm'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Current Banners Grid with drag-like order shifting and delete */}
                  <div className="space-y-3">
                    {(webConfigForm.banners || []).length === 0 ? (
                      <div className="bg-slate-50 border border-dashed rounded-xl p-6 text-center text-slate-500 text-xs">
                        Chưa cấu hình banner động riêng. Hệ thống đang sử dụng các banner mặc định của CLB.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {(webConfigForm.banners || []).map((banner, index) => {
                          // Parse alignmentPct from positioning string like object-[center_XX%] or default to 50
                          let pct = 50;
                          const match = banner.position?.match(/object-\[center_(\d+)%\]/);
                          if (match) {
                            pct = parseInt(match[1]);
                          }

                          return (
                            <div key={banner.id} className="bg-white border rounded-xl p-3 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-xs hover:border-slate-300 transition-colors">
                              <div className="flex items-center gap-3 w-full sm:w-auto">
                                {/* Micro Thumbnail */}
                                <div className="w-16 h-12 bg-slate-900 border rounded-lg overflow-hidden flex-shrink-0 relative">
                                  <img
                                    src={resolveAdminBannerImage(banner.image)}
                                    alt="Thumbnail"
                                    className="w-full h-full object-cover"
                                    style={{ objectPosition: `center ${pct}%` }}
                                    referrerPolicy="no-referrer"
                                  />
                                  <div className="absolute inset-0 bg-black/10"></div>
                                </div>

                                <div className="min-w-0 flex-grow">
                                  <h5 className="text-xs font-black text-slate-800 uppercase truncate leading-tight">
                                    {index + 1}. {banner.title || "Không có tiêu đề"}
                                  </h5>
                                  <p className="text-[10px] text-slate-500 truncate max-w-sm mt-0.5">
                                    {banner.subtitle || "Không có mô tả phụ"}
                                  </p>
                                  <span className="inline-block text-[9px] font-bold text-[#0054A6] bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 mt-1">
                                    Căn dọc: {pct}%
                                  </span>
                                </div>
                              </div>

                              {/* Order management + Edit + Delete */}
                              <div className="flex items-center gap-2 w-full sm:w-auto justify-end border-t sm:border-t-0 pt-2 sm:pt-0">
                                {/* Shifting order */}
                                <button
                                  type="button"
                                  disabled={index === 0}
                                  onClick={() => {
                                    const currentBanners = [...(webConfigForm.banners || [])];
                                    const temp = currentBanners[index];
                                    currentBanners[index] = currentBanners[index - 1];
                                    currentBanners[index - 1] = temp;
                                    setWebConfigForm({ ...webConfigForm, banners: currentBanners });
                                  }}
                                  className={`p-1 text-xs bg-white text-slate-600 transition-colors ${index === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-50 cursor-pointer border rounded-lg'}`}
                                  title="Di chuyển lên"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  disabled={index === (webConfigForm.banners || []).length - 1}
                                  onClick={() => {
                                    const currentBanners = [...(webConfigForm.banners || [])];
                                    const temp = currentBanners[index];
                                    currentBanners[index] = currentBanners[index + 1];
                                    currentBanners[index + 1] = temp;
                                    setWebConfigForm({ ...webConfigForm, banners: currentBanners });
                                  }}
                                  className={`p-1 text-xs bg-white text-slate-600 transition-colors ${index === (webConfigForm.banners || []).length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-slate-50 cursor-pointer border rounded-lg'}`}
                                  title="Di chuyển xuống"
                                >
                                  ▼
                                </button>

                                {/* Edit */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingBannerId(banner.id);
                                    setIsAddingBanner(false);
                                    setBannerForm({
                                      id: banner.id,
                                      image: banner.image,
                                      title: banner.title,
                                      subtitle: banner.subtitle,
                                      alignmentPct: pct
                                    });
                                  }}
                                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-[#0054A6] hover:bg-[#0054A6]/5 transition-colors cursor-pointer"
                                  title="Sửa banner"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm('Bạn có chắc chắn muốn xóa banner này?')) {
                                      const currentBanners = (webConfigForm.banners || []).filter(b => b.id !== banner.id);
                                      setWebConfigForm({ ...webConfigForm, banners: currentBanners });
                                      if (previewBannerIndex >= currentBanners.length && currentBanners.length > 0) {
                                        setPreviewBannerIndex(currentBanners.length - 1);
                                      }
                                    }
                                  }}
                                  className="p-1.5 rounded-lg border border-slate-200 text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                                  title="Xóa banner"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-[#0054A6] hover:bg-blue-800 text-white text-xs font-bold px-6 py-2.5 rounded-xl cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>Lưu Cấu Hình</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Cloud Database Sync View */}
          {activeTab === 'dbSync' && (
            <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-slate-200 animate-in fade-in duration-200">
              <div className="flex items-center gap-2 mb-5 border-b pb-4">
                <CheckCircle2 className="w-5 h-5 text-teal-600" />
                <h2 className="text-base font-black text-[#0054A6] uppercase tracking-tight">Đồng bộ dữ liệu Cloud</h2>
              </div>

              {/* Db Status Block */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-6">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">Trạng thái kết nối Cloud Database</h3>
                {loadingDbStatus ? (
                  <div className="flex items-center gap-2 text-xs text-slate-500 py-2">
                    <span className="w-4 h-4 border-2 border-[#0054A6] border-t-transparent rounded-full animate-spin"></span>
                    <span>Đang kiểm tra kết nối...</span>
                  </div>
                ) : dbStatus && !dbStatus.error ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="p-3 bg-white rounded-xl border space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-600">Firebase Firestore Cloud:</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${dbStatus.firebase?.hasConfig ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {dbStatus.firebase?.hasConfig ? 'Đã liên kết' : 'Chưa cấu hình'}
                          </span>
                        </div>
                        {dbStatus.firebase?.hasConfig ? (
                          <div className="text-[10px] text-slate-400 font-mono space-y-0.5">
                            <div>Project: <strong className="text-slate-600 font-semibold">{dbStatus.firebase?.projectId || 'N/A'}</strong></div>
                            <div>Test: <span className={dbStatus.firebase?.test?.includes('success') ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>{dbStatus.firebase?.test || 'Chưa chạy'}</span></div>
                            {dbStatus.firebase?.initError && (
                              <div className="text-rose-500 text-[9px] leading-tight break-all mt-1">Lỗi: {dbStatus.firebase?.initError}</div>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 leading-normal">
                            Sử dụng Firebase Firestore để lưu trữ đồng bộ dữ liệu thời gian thực.
                          </div>
                        )}
                      </div>
                      <div className="p-3 bg-white rounded-xl border space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-600">Vercel KV REST (Web API):</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${dbStatus.vercelKvRest?.hasUrl ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {dbStatus.vercelKvRest?.hasUrl ? 'Đã liên kết' : 'Chưa cấu hình'}
                          </span>
                        </div>
                        {dbStatus.vercelKvRest?.hasUrl && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Test: <span className={dbStatus.vercelKvRest?.test?.includes('success') ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>{dbStatus.vercelKvRest?.test || 'Chưa chạy'}</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3 bg-white rounded-xl border space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-600">Vercel Redis (TCP Socket):</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${dbStatus.redisTcp?.hasUrl ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {dbStatus.redisTcp?.hasUrl ? 'Đã liên kết' : 'Chưa cấu hình'}
                          </span>
                        </div>
                        {dbStatus.redisTcp?.hasUrl && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Test: <span className={dbStatus.redisTcp?.test?.includes('success') ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>{dbStatus.redisTcp?.test || 'Chưa chạy'}</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3 bg-white rounded-xl border space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-600">MongoDB Atlas Connection:</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${dbStatus.mongoDb?.hasUri ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                            {dbStatus.mongoDb?.hasUri ? 'Đã liên kết' : 'Chưa cấu hình'}
                          </span>
                        </div>
                        {dbStatus.mongoDb?.hasUri && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Test: <span className={dbStatus.mongoDb?.test?.includes('success') ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}>{dbStatus.mongoDb?.test || 'Chưa chạy'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-500 font-medium">
                      Phương thức lưu trữ hiện tại: <strong className="text-[#0054A6] font-bold">{dbStatus.storageType || 'Chưa xác định'}</strong>
                    </div>
                    <div className={`rounded-xl border p-3 text-[11px] ${
                      dbStatus.mediaStorage?.hasBucket && dbStatus.mediaStorage?.test?.includes('success')
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                        : 'border-amber-200 bg-amber-50 text-amber-800'
                    }`}>
                      <strong>Kho ảnh:</strong>{' '}
                      {dbStatus.mediaStorage?.hasBucket && dbStatus.mediaStorage?.test?.includes('success')
                        ? `Firebase Storage (${dbStatus.mediaStorage.bucket}). Ảnh mới được tách khỏi dữ liệu để trang tải nhanh hơn.`
                        : dbStatus.mediaStorage?.hasBucket
                          ? `Firebase Storage chưa dùng được (${dbStatus.mediaStorage.error || dbStatus.mediaStorage.test}). Ảnh đang rơi về Firestore dự phòng.`
                          : 'Ảnh đang dùng Firestore dự phòng. Khi số lượng ảnh tăng cao, hãy thêm FIREBASE_STORAGE_BUCKET trên Vercel để tránh đầy Firestore.'}
                    </div>
                  </div>
                ) : dbStatus && dbStatus.error ? (
                  <div className="space-y-2 py-1">
                    <div className="text-xs text-rose-600 font-bold">Không thể kết nối tới server API để lấy trạng thái!</div>
                    <div className="text-[10px] text-slate-500 font-mono bg-rose-50 border border-rose-100 p-3 rounded-xl leading-relaxed whitespace-pre-wrap">
                      <strong>Chi tiết lỗi kỹ thuật:</strong> {dbStatus.error}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-rose-600 font-bold">Không thể kết nối tới server API để lấy trạng thái!</div>
                )}
                
                <button
                  type="button"
                  onClick={fetchDbStatus}
                  className="mt-3 text-xs text-[#0054A6] font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  🔄 Tải lại trạng thái kết nối
                </button>
              </div>

              {/* Sync Controls */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 border border-dashed border-blue-200 rounded-2xl bg-blue-50/20 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-black text-[#0054A6] uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span>📤 ĐẨY DỮ LIỆU LÊN CLOUD</span>
                    </h3>
                    <p className="text-[11px] text-slate-600 leading-relaxed mb-4">
                      Hành động này sẽ lấy toàn bộ các dữ liệu (môn sinh, huấn luyện viên, danh mục, bài viết, câu lạc bộ, v.v.) hiện tại của bạn và tải đè lên Cloud Database. Mọi người truy cập web sau đó sẽ lập tức thấy dữ liệu thực này.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isSyncingCloud}
                    onClick={handleForceUploadToCloud}
                    className="w-full bg-[#0054A6] hover:bg-blue-800 text-white font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow disabled:opacity-50"
                  >
                    {isSyncingCloud ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Đang đồng bộ...</span>
                      </>
                    ) : (
                      <>
                        <span>Đẩy dữ liệu lên Cloud Database</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-5 border border-dashed border-teal-200 rounded-2xl bg-teal-50/10 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-black text-teal-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <span>📥 KÉO DỮ LIỆU TỪ CLOUD VỀ MÁY</span>
                    </h3>
                    <p className="text-[11px] text-slate-600 leading-relaxed mb-4">
                      Tải dữ liệu thực tế đang được lưu trữ trên Cloud về máy tính hiện tại. Thao tác này sẽ ghi đè toàn bộ dữ liệu hiện tại trong trình duyệt của bạn bằng bản ghi mới nhất từ Cloud.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isFetchingCloud}
                    onClick={handleForceDownloadFromCloud}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow disabled:opacity-50"
                  >
                    {isFetchingCloud ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>Đang tải xuống...</span>
                      </>
                    ) : (
                      <>
                        <span>Tải dữ liệu từ Cloud về máy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-amber-900">
                      Tối ưu ảnh đã lưu trước đây
                    </h3>
                    <p className="mt-1 max-w-3xl text-[11px] leading-relaxed text-amber-800">
                      Tách logo, banner và ảnh HLV/thành viên đang nhúng trong dữ liệu sang kho ảnh riêng để giảm dung lượng tải.
                      Hệ thống bắt buộc tạo bản sao lưu Cloud và tải một bản JSON về máy trước khi thực hiện.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isOptimizingMedia}
                    onClick={handleOptimizeExistingMedia}
                    className="shrink-0 rounded-xl bg-amber-600 px-5 py-3 text-xs font-bold text-white shadow transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isOptimizingMedia ? 'Đang sao lưu và tối ưu...' : 'Sao lưu & tối ưu ảnh'}
                  </button>
                </div>
              </div>

              {/* Firebase Firestore Setup Guide */}
              <div className="mt-8 border-t border-slate-200 pt-6">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#0054A6]/10 text-[#0054A6] text-[10px] font-bold">★</span>
                  <span>Hướng dẫn liên kết Firebase Firestore của bạn (Lưu trữ đồng bộ lâu dài)</span>
                </h3>
                <p className="text-[11.5px] text-slate-600 leading-relaxed mb-4">
                  Do tài khoản hệ thống của AI Studio không có quyền tự động tạo Database trong Firebase của bạn (Lỗi <code>permission_denied</code> từ Google Cloud), bạn cần cấu hình tay 3 biến môi trường sau trên <strong>Vercel Dashboard &rarr; Project Settings &rarr; Environment Variables</strong> của bạn. Điều này sẽ giúp lưu logo và mọi thay đổi trực tiếp vào Firebase của bạn:
                </p>
                <div className="bg-slate-900 text-slate-100 p-4 rounded-xl font-mono text-[11px] space-y-1.5 mb-4 leading-normal select-all">
                  <div>FIREBASE_PROJECT_ID= <span className="text-amber-300">"ID dự án Firebase của bạn"</span></div>
                  <div>FIREBASE_CLIENT_EMAIL= <span className="text-amber-300">"Email tài khoản dịch vụ (Service Account Email)"</span></div>
                  <div>FIREBASE_PRIVATE_KEY= <span className="text-amber-300">"Khóa bảo mật riêng tư (Private Key bắt đầu bằng -----BEGIN PRIVATE KEY-----)"</span></div>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  * Sau khi thêm xong 3 biến này, bạn chỉ cần bấm <strong>Redeploy</strong> lại dự án trên Vercel để cập nhật. Khi đó, Firebase sẽ lập tức nhận và hiển thị dữ liệu thật tức thời!
                </p>
              </div>

              {/* Vercel KV Setup Guide */}
              <div className="mt-6 border-t border-slate-200 pt-5">
                <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-blue-50 text-[#0054A6] text-[10px] font-bold">i</span>
                  <span>Cách kích hoạt nhanh Cloud Database miễn phí thay thế qua Vercel KV</span>
                </h3>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                  Nếu bạn không muốn cấu hình Firebase thủ công, bạn có thể tạo nhanh một Vercel KV Redis database trực tiếp trên tài khoản Vercel của mình chỉ với 3 click chuột (Hoàn toàn miễn phí và không cần cấu hình khóa bảo mật phức tạp):
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-[#0054A6]/5 rounded-2xl border border-[#0054A6]/10 space-y-1.5">
                    <span className="text-[10px] uppercase font-black text-[#0054A6] tracking-wider block font-sans">BƯỚC 1: Vào Vercel</span>
                    <p className="text-[10.5px] text-slate-600 leading-relaxed font-sans">
                      Mở trang quản lý <strong>Vercel Dashboard</strong> của bạn và bấm chọn dự án website Vovinam này.
                    </p>
                  </div>
                  <div className="p-4 bg-teal-50/20 rounded-2xl border border-teal-100 space-y-1.5">
                    <span className="text-[10px] uppercase font-black text-teal-700 tracking-wider block font-sans">BƯỚC 2: Kết nối KV (Redis)</span>
                    <p className="text-[10.5px] text-slate-600 leading-relaxed font-sans">
                      Chọn tab <strong>Storage</strong> ở thanh menu trên &rarr; bấm <strong>Connect Database</strong> &rarr; chọn <strong>KV (Redis)</strong> và bấm tạo mới.
                    </p>
                  </div>
                  <div className="p-4 bg-amber-50/30 rounded-2xl border border-amber-100 space-y-1.5">
                    <span className="text-[10px] uppercase font-black text-amber-700 tracking-wider block font-sans">BƯỚC 3: Redeploy dự án</span>
                    <p className="text-[10.5px] text-slate-600 leading-relaxed font-sans">
                      Vercel sẽ tự động điền các biến môi trường kết nối. Bạn chỉ cần chọn tab <strong>Deployments</strong> &rarr; bấm vào dấu 3 chấm của bản deploy mới nhất &rarr; chọn <strong>Redeploy</strong> là xong!
                    </p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl text-[11px] font-semibold flex items-center gap-2">
                  <span className="text-emerald-500 font-bold">✔</span>
                  <span>Sau khi liên kết một trong các Cloud Database trên thành công, website sẽ tự động đồng bộ và lưu dữ liệu thật vĩnh viễn theo thời gian thực!</span>
                </div>
              </div>
            </div>
          )}

          {isCrudTab && isEditing && (
            /* ========================================================= */
            /* DYNAMIC FORM VIEW                                         */
            /* ========================================================= */
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 animate-in fade-in duration-200">
              <div className="flex items-center justify-between border-b pb-4 mb-6">
                <h3 className="text-base font-black text-[#0054A6] uppercase">
                  {editId === null ? 'Thêm mới' : 'Cập nhật'} - {
                    activeTab === 'articles' ? 'Bài viết' :
                    activeTab === 'categories' ? 'Danh mục' :
                    activeTab === 'coaches' ? 'Huấn luyện viên' :
                    activeTab === 'members' ? 'Thành viên CLB' :
                    activeTab === 'achievements' ? 'Thành tích' :
                    activeTab === 'tournaments' ? 'Giải đấu' :
                    activeTab === 'clubs' ? 'Câu lạc bộ' : 'Highlight'
                  }
                </h3>
                <button 
                  onClick={() => setIsEditing(false)}
                  className="p-1.5 rounded-full hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                
                {/* 1. ARTICLES FORM */}
                {activeTab === 'articles' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tiêu đề bài viết</label>
                        <input 
                          type="text" 
                          value={articleForm.title || ''}
                          onChange={e => setArticleForm({ ...articleForm, title: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã Bài Viết (ID tự chọn)</label>
                        <input 
                          type="text" 
                          placeholder="Nhập ID tự chọn (hoặc để trống để tự động tăng)"
                          value={articleForm.id || ''}
                          onChange={e => setArticleForm({ ...articleForm, id: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Danh mục</label>
                        <select 
                          value={articleForm.categoryId || ''}
                          onChange={e => setArticleForm({ ...articleForm, categoryId: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        >
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <ImageInput 
                          label="Ảnh đại diện bài viết"
                          value={articleForm.image || ''}
                          onChange={val => setArticleForm({ ...articleForm, image: val })}
                          id="article-image-uploader"
                          aspectRatio="16:9"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ngày đăng</label>
                        <input 
                          type="date" 
                          value={articleForm.date || ''}
                          onChange={e => setArticleForm({ ...articleForm, date: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Lượt xem bài viết</label>
                        <input 
                          type="number" 
                          min="0"
                          value={articleForm.views !== undefined ? articleForm.views : 0}
                          onChange={e => setArticleForm({ ...articleForm, views: parseInt(e.target.value) || 0 })}
                          className="w-full text-sm border p-2 rounded-lg"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nội dung bài viết (Dạng văn bản báo chí)</label>
                      <RichTextEditor
                        value={articleForm.content || ''}
                        onChange={content => setArticleForm(current => ({ ...current, content }))}
                        placeholder="Nhập nội dung bài báo..."
                      />
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="art-status"
                          checked={articleForm.status !== false}
                          onChange={e => setArticleForm({ ...articleForm, status: e.target.checked })}
                          className="w-4 h-4 text-[#0054A6]"
                        />
                        <label htmlFor="art-status" className="text-sm font-semibold text-slate-700">Hiển thị bài viết ra công chúng</label>
                      </div>

                      <div className="flex items-start gap-2">
                        <input 
                          type="checkbox" 
                          id="art-showInNews"
                          checked={!!articleForm.showInNews}
                          onChange={e => {
                            const checked = e.target.checked;
                            setArticleForm(current => ({
                              ...current,
                              showInNews: checked,
                              featuredDays: normalizeLatestNewsDays(current.featuredDays),
                              featuredAt: checked
                                ? (current.featuredAt || new Date().toISOString())
                                : undefined
                            }));
                          }}
                          className="w-4 h-4 mt-0.5 text-[#0054A6]"
                        />
                        <div>
                          <label htmlFor="art-showInNews" className="text-sm font-bold text-[#0054A6] block">
                            Đẩy lên mục "Tin tức mới nhất"
                          </label>
                          <span className="text-[10px] text-slate-500 block font-normal normal-case mt-0.5">
                            Mỗi bài có thể chọn số ngày nổi bật riêng. Khi hết thời gian, bài chỉ tự ẩn khỏi khu vực nổi bật và vẫn giữ nguyên ở danh mục gốc.
                          </span>
                        </div>
                      </div>
                      {articleForm.showInNews && (
                        <div className="ml-6 max-w-xs">
                          <label htmlFor="art-featuredDays" className="block text-xs font-bold text-slate-600 mb-1">
                            Số ngày hiển thị
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              id="art-featuredDays"
                              min={MIN_LATEST_NEWS_DAYS}
                              max={MAX_LATEST_NEWS_DAYS}
                              step={1}
                              value={normalizeLatestNewsDays(articleForm.featuredDays)}
                              onChange={event => setArticleForm(current => ({
                                ...current,
                                featuredDays: normalizeLatestNewsDays(event.target.value)
                              }))}
                              className="w-28 text-sm border border-slate-200 bg-white p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0054A6]/20 focus:border-[#0054A6]"
                            />
                            <span className="text-xs font-semibold text-slate-500">ngày</span>
                          </div>
                          <p className="text-[10px] text-slate-400 mt-1">
                            Nhập từ {MIN_LATEST_NEWS_DAYS} đến {MAX_LATEST_NEWS_DAYS} ngày.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. CATEGORIES FORM */}
                {activeTab === 'categories' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã danh mục (ID tự chọn)</label>
                        <input 
                          type="text" 
                          value={categoryForm.id || ''}
                          onChange={e => setCategoryForm({ ...categoryForm, id: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                          placeholder="Ví dụ: TIN_CLB, KIEU_MAU"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên danh mục</label>
                        <input 
                          type="text" 
                          value={categoryForm.name || ''}
                          onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Thứ tự hiển thị</label>
                        <input 
                          type="number" 
                          value={categoryForm.order || 0}
                          onChange={e => setCategoryForm({ ...categoryForm, order: parseInt(e.target.value) || 0 })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mô tả ngắn</label>
                        <input 
                          type="text" 
                          value={categoryForm.description || ''}
                          onChange={e => setCategoryForm({ ...categoryForm, description: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg"
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="cat-status"
                        checked={categoryForm.status !== false}
                        onChange={e => setCategoryForm({ ...categoryForm, status: e.target.checked })}
                      />
                      <label htmlFor="cat-status" className="text-sm font-semibold text-slate-700">Trạng thái hoạt động</label>
                    </div>
                  </div>
                )}

                {/* 3. COACHES FORM */}
                {activeTab === 'coaches' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã HLV (ID tự chọn)</label>
                        <input 
                          type="text" 
                          value={coachForm.id || ''}
                          onChange={e => setCoachForm({ ...coachForm, id: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                          placeholder="Ví dụ: HLV_THIEN"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Họ và tên</label>
                        <input 
                          type="text" 
                          value={coachForm.fullName || ''}
                          onChange={e => setCoachForm({ ...coachForm, fullName: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        />
                      </div>
                      <div>
                        <ImageInput 
                          label="Ảnh đại diện (Huấn luyện viên)"
                          value={coachForm.photo || ''}
                          onChange={val => setCoachForm({ ...coachForm, photo: val })}
                          id="coach-photo-uploader"
                          aspectRatio="1:1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Năm sinh</label>
                        <input 
                          type="number" 
                          value={coachForm.birthYear || 1990}
                          onChange={e => setCoachForm({ ...coachForm, birthYear: parseInt(e.target.value) || 1990 })}
                          className="w-full text-sm border p-2 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-2 focus:ring-[#0054A6] outline-none" required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Đẳng cấp (Đai / Cấp bậc)</label>
                        <input 
                          type="text" 
                          value={coachForm.rank || ''}
                          onChange={e => setCoachForm({ ...coachForm, rank: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                          placeholder="Ví dụ: Chuẩn Hồng Đai"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Thuộc Câu Lạc Bộ</label>
                        <select 
                          value={coachForm.clubId || ''}
                          onChange={e => setCoachForm({ ...coachForm, clubId: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        >
                          {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Kinh nghiệm giảng dạy</label>
                      <textarea 
                        value={coachForm.experience || ''}
                        onChange={e => setCoachForm({ ...coachForm, experience: e.target.value })}
                        className="w-full text-sm border p-2 rounded-lg"
                        rows={3}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="coach-status"
                        checked={coachForm.status !== false}
                        onChange={e => setCoachForm({ ...coachForm, status: e.target.checked })}
                      />
                      <label htmlFor="coach-status" className="text-sm font-semibold text-slate-700">Trạng thái hoạt động</label>
                    </div>
                  </div>
                )}

                {/* 4. MEMBERS FORM */}
                {activeTab === 'members' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã Thành Viên (ID tự chọn)</label>
                        <input 
                          type="text" 
                          value={memberForm.id || ''}
                          onChange={e => setMemberForm({ ...memberForm, id: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                          placeholder="Ví dụ: TV001"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ID thứ tự hiển thị</label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={memberForm.displayOrder || ''}
                          onChange={e => setMemberForm({
                            ...memberForm,
                            displayOrder: Number.parseInt(e.target.value, 10) || undefined
                          })}
                          className="w-full text-sm border p-2 rounded-lg focus:ring-2 focus:ring-[#0054A6] outline-none"
                          placeholder="Ví dụ: 1"
                          required
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Số nhỏ hiển thị trước; không được trùng.</p>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Họ và tên</label>
                        <input 
                          type="text" 
                          value={memberForm.fullName || ''}
                          onChange={e => setMemberForm({ ...memberForm, fullName: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        />
                      </div>
                      <div>
                        <ImageInput 
                          label="Ảnh đại diện (Thành viên CLB)"
                          value={memberForm.photo || ''}
                          onChange={val => setMemberForm({ ...memberForm, photo: val })}
                          id="member-photo-uploader"
                          aspectRatio="1:1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Năm sinh</label>
                        <input 
                          type="number" 
                          value={memberForm.birthYear || 2005}
                          onChange={e => setMemberForm({ ...memberForm, birthYear: parseInt(e.target.value) || 2005 })}
                          className="w-full text-sm border p-2 rounded-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-2 focus:ring-[#0054A6] outline-none" required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Đẳng cấp (Đai)</label>
                        <input 
                          type="text" 
                          value={memberForm.rank || ''}
                          onChange={e => setMemberForm({ ...memberForm, rank: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                          placeholder="Ví dụ: Lam Đai Đệ Tam Cấp"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Thuộc Câu lạc bộ</label>
                        <select 
                          value={memberForm.clubId || ''}
                          onChange={e => setMemberForm({ ...memberForm, clubId: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        >
                          {clubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="member-status"
                        checked={memberForm.status !== false}
                        onChange={e => setMemberForm({ ...memberForm, status: e.target.checked })}
                      />
                      <label htmlFor="member-status" className="text-sm font-semibold text-slate-700">Trạng thái hoạt động</label>
                    </div>
                  </div>
                )}

                {/* 5. ACHIEVEMENTS FORM */}
                {activeTab === 'achievements' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã thành tích (ID tự chọn)</label>
                        <input 
                          type="text" 
                          value={achievementForm.id || ''}
                          onChange={e => setAchievementForm({ ...achievementForm, id: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg focus:ring-2 focus:ring-[#0054A6] outline-none" required
                          placeholder="Ví dụ: TT001"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Loại huy chương</label>
                        <select 
                          value={achievementForm.medalType || 'Vàng'}
                          onChange={e => setAchievementForm({ ...achievementForm, medalType: e.target.value as any })}
                          className="w-full text-sm border p-2 rounded-lg focus:ring-2 focus:ring-[#0054A6] outline-none" required
                        >
                          <option value="Vàng">🥇 Huy Chương Vàng</option>
                          <option value="Bạc">🥈 Huy Chương Bạc</option>
                          <option value="Đồng">🥉 Huy Chương Đồng</option>
                          <option value="Khác">🏆 Khác</option>
                        </select>
                      </div>

                      {/* Dynamic Coach/Member ID Lookup Section */}
                      <div className="sm:col-span-2 bg-blue-50/20 p-4 rounded-xl border border-[#0054A6]/20">
                        <h3 className="text-xs font-bold text-[#0054A6] uppercase tracking-wider mb-2.5">
                          Liên kết người đạt giải (Bằng cách nhập hoặc chọn ID)
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nhập ID Môn sinh hoặc HLV</label>
                            <input 
                              type="text" 
                              placeholder="Ví dụ: TV001 hoặc HLV_THIEN"
                              value={(achievementForm.memberIds && achievementForm.memberIds[0]) || ''}
                              onChange={e => {
                                const val = e.target.value.trim();
                                const foundMember = members.find(m => m.id.toLowerCase() === val.toLowerCase());
                                const foundCoach = coaches.find(c => c.id.toLowerCase() === val.toLowerCase());
                                
                                if (foundMember) {
                                  setAchievementForm({
                                    ...achievementForm,
                                    athleteName: foundMember.fullName,
                                    memberIds: [foundMember.id]
                                  });
                                } else if (foundCoach) {
                                  setAchievementForm({
                                    ...achievementForm,
                                    athleteName: foundCoach.fullName,
                                    memberIds: [foundCoach.id]
                                  });
                                } else {
                                  // Just set the state's ID list
                                  setAchievementForm({
                                    ...achievementForm,
                                    memberIds: [val]
                                  });
                                }
                              }}
                              className="w-full text-sm border border-[#0054A6]/30 p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#0054A6]"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Chọn nhanh từ danh sách CLB</label>
                            <select
                              value={(achievementForm.memberIds && achievementForm.memberIds[0]) || ''}
                              onChange={e => {
                                const val = e.target.value;
                                const foundMember = members.find(m => m.id === val);
                                const foundCoach = coaches.find(c => c.id === val);
                                
                                if (foundMember) {
                                  setAchievementForm({
                                    ...achievementForm,
                                    athleteName: foundMember.fullName,
                                    memberIds: [foundMember.id]
                                  });
                                } else if (foundCoach) {
                                  setAchievementForm({
                                    ...achievementForm,
                                    athleteName: foundCoach.fullName,
                                    memberIds: [foundCoach.id]
                                  });
                                }
                              }}
                              className="w-full text-sm border border-slate-300 p-2 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#0054A6]"
                            >
                              <option value="">-- Chọn Môn sinh hoặc HLV --</option>
                              <optgroup label="Danh sách Huấn luyện viên">
                                {coaches.map(c => (
                                  <option key={c.id} value={c.id}>{c.fullName} (ID: {c.id})</option>
                                ))}
                              </optgroup>
                              <optgroup label="Danh sách Môn sinh/Thành viên">
                                {members.map(m => (
                                  <option key={m.id} value={m.id}>{m.fullName} (ID: {m.id})</option>
                                ))}
                              </optgroup>
                            </select>
                          </div>
                        </div>

                        {/* Real-time Match Visual Confirmation Card */}
                        {(() => {
                          const typedId = (achievementForm.memberIds && achievementForm.memberIds[0]) || '';
                          const matchedMember = members.find(m => m.id.toLowerCase() === typedId.toLowerCase());
                          const matchedCoach = coaches.find(c => c.id.toLowerCase() === typedId.toLowerCase());
                          const person = matchedMember || matchedCoach;
                          const isCoach = !!matchedCoach;

                          if (person) {
                            return (
                              <div className="mt-3 p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-3 animate-fade-in">
                                {person.photo || (person as any).photo ? (
                                  <img src={person.photo || (person as any).photo} alt={person.fullName} className="w-9 h-9 rounded-full object-cover border border-emerald-300" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-9 h-9 bg-emerald-200 text-emerald-800 rounded-full flex items-center justify-center font-bold text-xs border border-emerald-300">
                                    {isCoach ? 'VS' : 'MS'}
                                  </div>
                                )}
                                <div className="text-xs leading-tight">
                                  <p className="font-extrabold text-emerald-950 uppercase tracking-wide">
                                    {isCoach ? '🟢 Huấn Luyện Viên' : '🔵 Môn Sinh'}
                                  </p>
                                  <p className="font-bold text-slate-800 text-sm mt-0.5">{person.fullName}</p>
                                  <p className="text-slate-500 text-[10px] mt-0.5">ID: {person.id} • Đai: {person.rank}</p>
                                </div>
                                <span className="ml-auto text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-full text-[10px] font-black uppercase">✓ KHỚP HỒ SƠ</span>
                              </div>
                            );
                          } else if (typedId) {
                            return (
                              <div className="mt-3 p-2 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-800 font-medium">
                                ⚠️ ID "<strong>{typedId}</strong>" chưa khớp với HLV hay Môn sinh nào. Bạn vẫn có thể điền họ tên thủ công ở dưới.
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Họ và tên người nhận giải (Môn sinh/HLV)</label>
                        <input 
                          type="text" 
                          value={achievementForm.athleteName || ''}
                          onChange={e => setAchievementForm({ ...achievementForm, athleteName: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg focus:ring-2 focus:ring-[#0054A6] outline-none" required
                          placeholder="Ví dụ: Trần Quốc Thiện"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nội dung đạt giải / Tiêu đề thành tích</label>
                        <input 
                          type="text" 
                          value={achievementForm.title || ''}
                          onChange={e => setAchievementForm({ ...achievementForm, title: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg focus:ring-2 focus:ring-[#0054A6] outline-none" required
                          placeholder="Ví dụ: Huy chương Vàng - Đối kháng Nam 50kg"
                        />
                      </div>
                      <div>
                        <ImageInput 
                          label="Hình ảnh thành tích hoặc môn sinh"
                          value={achievementForm.image || ''}
                          onChange={val => setAchievementForm({ ...achievementForm, image: val })}
                          id="achievement-image-uploader"
                          aspectRatio="16:9"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Đơn vị đạt giải (Tự điền)</label>
                        <input 
                          type="text" 
                          value={achievementForm.unit || ''}
                          onChange={e => setAchievementForm({ ...achievementForm, unit: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg focus:ring-2 focus:ring-[#0054A6] outline-none" required
                          placeholder="Ví dụ: CLB Vovinam Xóm Chiếu"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên giải đấu (Tự điền)</label>
                        <input 
                          type="text" 
                          list="achievement-saved-tournaments"
                          value={achievementForm.tournamentName || ''}
                          onChange={e => {
                            const name = e.target.value;
                            const matchedTournament = tournaments.find(t => t.name === name);
                            setAchievementForm({
                              ...achievementForm,
                              tournamentName: name,
                              tournamentId: matchedTournament?.id || ''
                            });
                          }}
                          className="w-full text-sm border p-2 rounded-lg focus:ring-2 focus:ring-[#0054A6] outline-none" required
                          placeholder="Ví dụ: Giải Vô địch Trẻ Vovinam 2026"
                        />
                        <datalist id="achievement-saved-tournaments">
                          {savedAchievementTournamentNames.map(name => <option key={name} value={name} />)}
                        </datalist>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ngày đạt giải (Tự động tính Năm)</label>
                        <input 
                          type="date" 
                          value={achievementForm.date || ''}
                          onChange={e => {
                            const d = e.target.value;
                            const y = d ? new Date(d).getFullYear().toString() : '';
                            setAchievementForm({ ...achievementForm, date: d, year: y });
                          }}
                          className="w-full text-sm border p-2 rounded-lg focus:ring-2 focus:ring-[#0054A6] outline-none" required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 border-t pt-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                          Ý nghĩa thành tích (Không bắt buộc)
                        </label>
                        <textarea
                          rows={4}
                          value={achievementForm.meaning || ''}
                          onChange={e => setAchievementForm({ ...achievementForm, meaning: e.target.value })}
                          className="w-full text-sm border p-3 rounded-lg focus:ring-2 focus:ring-[#0054A6] outline-none resize-y"
                          placeholder="Để trống, website sẽ tự hiển thị nội dung mặc định phù hợp với thành tích."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                          Hành trình chinh phục vinh quang (Không bắt buộc)
                        </label>
                        <textarea
                          rows={5}
                          value={achievementForm.journey || ''}
                          onChange={e => setAchievementForm({ ...achievementForm, journey: e.target.value })}
                          className="w-full text-sm border p-3 rounded-lg focus:ring-2 focus:ring-[#0054A6] outline-none resize-y"
                          placeholder={'Nhập mỗi giai đoạn trên một dòng.\nVí dụ: Giai đoạn chuẩn bị: ...\nQuá trình tập luyện: ...\nPhút tỏa sáng: ...'}
                        />
                        <p className="text-[10px] text-slate-400 mt-1">Mỗi dòng sẽ được hiển thị thành một bước được đánh số ngoài trang người dùng.</p>
                      </div>
                      <div className="space-y-3 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
                        <div>
                          <h4 className="text-xs font-black uppercase tracking-wider text-[#0054A6]">
                            Nội dung khung Vinh danh bảng vàng
                          </h4>
                          <p className="mt-1 text-[10px] text-slate-500">
                            Có thể sửa riêng cho từng thành tích. Để trống, website sẽ dùng nội dung mặc định.
                          </p>
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-bold uppercase text-slate-500">
                            Tiêu đề khung
                          </label>
                          <input
                            type="text"
                            value={achievementForm.honorTitle || ''}
                            onChange={e => setAchievementForm({ ...achievementForm, honorTitle: e.target.value })}
                            className="w-full rounded-lg border p-2 text-sm outline-none focus:ring-2 focus:ring-[#0054A6]"
                            placeholder="Mặc định: Vinh danh bảng vàng"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-bold uppercase text-slate-500">
                            Nội dung vinh danh
                          </label>
                          <textarea
                            rows={3}
                            value={achievementForm.honorQuote || ''}
                            onChange={e => setAchievementForm({ ...achievementForm, honorQuote: e.target.value })}
                            className="w-full resize-y rounded-lg border p-3 text-sm outline-none focus:ring-2 focus:ring-[#0054A6]"
                            placeholder="Nhập câu trích dẫn hoặc lời vinh danh..."
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-[11px] font-bold uppercase text-slate-500">
                            Người hoặc đơn vị ghi nhận
                          </label>
                          <input
                            type="text"
                            value={achievementForm.honorAttribution || ''}
                            onChange={e => setAchievementForm({ ...achievementForm, honorAttribution: e.target.value })}
                            className="w-full rounded-lg border p-2 text-sm outline-none focus:ring-2 focus:ring-[#0054A6]"
                            placeholder="Mặc định: Ban huấn luyện Vovinam Xóm Chiếu"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Associated member/coach profiles */}
                    <div className="border-t pt-4">
                      <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                        Người đạt giải (Ghi nhận vào hồ sơ Thành viên / HLV)
                      </label>
                      <p className="text-[11px] text-slate-400 mb-3">
                        Tìm theo ID hoặc họ tên rồi tích chọn. Thành tích sẽ tự động hiển thị trong chi tiết của Thành viên hoặc HLV tương ứng.
                      </p>
                      {members.length === 0 && coaches.length === 0 ? (
                        <p className="text-xs text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100 italic">
                          Chưa có Thành viên hoặc HLV nào trong hệ thống.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          <input 
                            type="text"
                            placeholder="🔍 Nhập ID hoặc tên Thành viên / HLV để tìm nhanh..."
                            value={memberSearchQuery}
                            onChange={e => setMemberSearchQuery(e.target.value)}
                            className="w-full text-xs border border-slate-200 p-2 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#0054A6]"
                          />
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-2 border rounded-xl bg-slate-50/50">
                            {[...members.map(person => ({ ...person, profileType: 'member' as const })), ...coaches.map(person => ({ ...person, profileType: 'coach' as const }))]
                              .filter(person => {
                                const club = clubById.get(person.clubId);
                                return matchesSmartSearch(
                                  memberSearchQuery,
                                  person.id,
                                  person.fullName,
                                  person.birthYear,
                                  person.rank,
                                  person.clubId,
                                  club?.name,
                                  person.profileType === 'coach' ? 'huấn luyện viên hlv' : 'thành viên môn sinh'
                                );
                              })
                              .map(person => {
                                const isChecked = achievementForm.memberIds?.includes(person.id) || false;
                                return (
                                  <label 
                                    key={`${person.profileType}-${person.id}`} 
                                    className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer select-none transition-all ${
                                      isChecked 
                                        ? 'bg-blue-50 border-blue-200 text-[#0054A6] font-bold shadow-sm' 
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                  >
                                    <input 
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={e => {
                                        const currentIds = achievementForm.memberIds || [];
                                        if (e.target.checked) {
                                          setAchievementForm({ ...achievementForm, memberIds: Array.from(new Set([...currentIds, person.id])) });
                                        } else {
                                          setAchievementForm({ ...achievementForm, memberIds: currentIds.filter(id => id !== person.id) });
                                        }
                                      }}
                                      className="rounded border-slate-300 text-[#0054A6] focus:ring-[#0054A6] w-4 h-4 cursor-pointer"
                                    />
                                    <div className="flex items-center gap-2">
                                      {person.photo ? (
                                        <img src={person.photo} alt={person.fullName} className="w-7 h-7 rounded-full object-cover border" referrerPolicy="no-referrer" />
                                      ) : (
                                        <div className="w-7 h-7 bg-blue-100 text-[#0054A6] rounded-full flex items-center justify-center font-bold text-[10px]">
                                          {person.fullName.charAt(0)}
                                        </div>
                                      )}
                                      <div className="text-left">
                                        <p className="text-xs font-bold leading-tight">{person.fullName}</p>
                                        <p className="text-[9px] text-slate-400 font-medium">
                                          {person.profileType === 'coach' ? 'HLV' : 'Thành viên'} • {person.rank} (ID: {person.id})
                                        </p>
                                      </div>
                                    </div>
                                  </label>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input 
                        type="checkbox" 
                        id="ach-status"
                        checked={achievementForm.status !== false}
                        onChange={e => setAchievementForm({ ...achievementForm, status: e.target.checked })}
                      />
                      <label htmlFor="ach-status" className="text-sm font-semibold text-slate-700">Hiển thị thành tích</label>
                    </div>
                  </div>
                )}

                {/* 6. TOURNAMENTS FORM */}
                {activeTab === 'tournaments' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã giải đấu (ID tự chọn)</label>
                        <input 
                          type="text" 
                          value={tournamentForm.id || ''}
                          onChange={e => setTournamentForm({ ...tournamentForm, id: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg font-mono focus:ring-1 focus:ring-[#0054A6] outline-none" required
                          placeholder="Ví dụ: GD001"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên giải đấu</label>
                        <input 
                          type="text" 
                          list="tournament-saved-names"
                          value={tournamentForm.name || ''}
                          onChange={e => setTournamentForm({ ...tournamentForm, name: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        />
                        <datalist id="tournament-saved-names">
                          {savedAchievementTournamentNames.map(name => <option key={name} value={name} />)}
                        </datalist>
                      </div>
                      <div>
                        <ImageInput 
                          label="Ảnh đại diện giải đấu"
                          value={tournamentForm.image || ''}
                          onChange={val => setTournamentForm({ ...tournamentForm, image: val })}
                          id="tournament-image-uploader"
                          aspectRatio="16:9"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Thời gian diễn ra</label>
                        <input 
                          type="text" 
                          value={tournamentForm.date || ''}
                          onChange={e => setTournamentForm({ ...tournamentForm, date: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                          placeholder="Ví dụ: 15/08 đến 22/08/2026"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Địa điểm tổ chức</label>
                        <input 
                          type="text" 
                          value={tournamentForm.location || ''}
                          onChange={e => setTournamentForm({ ...tournamentForm, location: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Trạng thái giải đấu</label>
                        <select 
                          value={tournamentForm.status || 'sắp diễn ra'}
                          onChange={e => setTournamentForm({ ...tournamentForm, status: e.target.value as any })}
                          className="w-full text-sm border p-2 rounded-lg" required
                        >
                          <option value="đang diễn ra">🟢 Đang diễn ra</option>
                          <option value="sắp diễn ra">🟡 Sắp diễn ra</option>
                          <option value="đã kết thúc">🔴 Đã kết thúc</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-black text-[#0054A6] uppercase mb-1">
                            Tên địa điểm đúng trên Google Maps
                          </label>
                          <input
                            type="text"
                            value={tournamentForm.googleMapPlaceName || ''}
                            onChange={e => setTournamentForm({ ...tournamentForm, googleMapPlaceName: e.target.value })}
                            className="w-full text-sm border p-2 rounded-lg bg-white"
                            placeholder="Ví dụ: Nhà thi đấu Hồ Xuân Hương"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-[#0054A6] uppercase mb-1">
                            Mã nhúng Google Maps chính xác
                          </label>
                          <textarea
                            value={tournamentForm.googleMapUrl || ''}
                            onChange={e => setTournamentForm({ ...tournamentForm, googleMapUrl: e.target.value })}
                            className="w-full text-xs border p-2 rounded-lg bg-white font-mono"
                            rows={4}
                            placeholder={'Dán toàn bộ đoạn <iframe src="https://www.google.com/maps/embed?...">...</iframe>'}
                          />
                          <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                            Google Maps → Chia sẻ → Nhúng bản đồ → Sao chép HTML. Không dùng link rút gọn maps.app.goo.gl.
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-black uppercase text-slate-600">Xem trước đúng vị trí sẽ hiển thị</p>
                        <div className="h-52 overflow-hidden rounded-xl border border-slate-200 bg-white">
                          <iframe
                            title="Xem trước bản đồ giải đấu"
                            src={buildGoogleMapsEmbedUrl(
                              tournamentForm.googleMapUrl,
                              [
                                tournamentForm.googleMapPlaceName || tournamentForm.name,
                                tournamentForm.location,
                                'Việt Nam'
                              ].filter(Boolean).join(', ')
                            )}
                            className="h-full w-full"
                            style={{ border: 0 }}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 border-t pt-4">
                      <div>
                        <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Giới thiệu giải đấu</label>
                        <textarea 
                          value={tournamentForm.introduction || ''}
                          onChange={e => setTournamentForm({ ...tournamentForm, introduction: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg font-sans focus:ring-1 focus:ring-[#0054A6] outline-none"
                          rows={3}
                          placeholder="Nhập thông tin giới thiệu chi tiết về giải đấu..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Lịch trình giải đấu</label>
                        <textarea 
                          value={tournamentForm.schedule || ''}
                          onChange={e => setTournamentForm({ ...tournamentForm, schedule: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg font-mono focus:ring-1 focus:ring-[#0054A6] outline-none"
                          rows={3}
                          placeholder="Nhập chi tiết lịch trình thi đấu..."
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">Điều lệ giải đấu</label>
                        <textarea 
                          value={tournamentForm.rules || ''}
                          onChange={e => setTournamentForm({ ...tournamentForm, rules: e.target.value })}
                          className="w-full text-sm border p-2 rounded-lg font-sans focus:ring-1 focus:ring-[#0054A6] outline-none"
                          rows={3}
                          placeholder="Nhập quy chế, điều lệ, và yêu cầu đăng ký thi đấu..."
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* 7. CLUBS FORM */}
                {activeTab === 'clubs' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Column: Club Info & Image & Training Schedule */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã CLB (ID tự chọn)</label>
                          <input 
                            type="text" 
                            value={clubForm.id || ''}
                            onChange={e => setClubForm({ ...clubForm, id: e.target.value })}
                            className="w-full text-sm border p-2 rounded-lg" required
                            placeholder="Ví dụ: CLB_XC"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên Câu Lạc Bộ</label>
                          <input 
                            type="text" 
                            value={clubForm.name || ''}
                            onChange={e => setClubForm({ ...clubForm, name: e.target.value })}
                            className="w-full text-sm border p-2 rounded-lg" required
                          />
                        </div>
                        <div>
                          <ImageInput 
                            label="Ảnh đại diện câu lạc bộ"
                            value={clubForm.image || ''}
                            onChange={val => setClubForm({ ...clubForm, image: val })}
                            id="club-image-uploader"
                            aspectRatio="16:9"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ngày tập trong tuần</label>
                            <input 
                              type="text" 
                              value={clubForm.trainingDays || ''}
                              onChange={e => setClubForm({ ...clubForm, trainingDays: e.target.value })}
                              className="w-full text-sm border p-2 rounded-lg" required
                              placeholder="Ví dụ: Thứ 2 - 4 - 6"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Giờ tập</label>
                            <input 
                              type="text" 
                              value={clubForm.trainingHours || ''}
                              onChange={e => setClubForm({ ...clubForm, trainingHours: e.target.value })}
                              className="w-full text-sm border p-2 rounded-lg" required
                              placeholder="Ví dụ: 18:00 - 19:30 & 19:30 - 21:00"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Right Column: Head Coach Lookup & Location Details */}
                      <div className="space-y-3">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <label className="block text-xs font-bold text-[#0054A6] uppercase mb-1">Võ sư/HLV phụ trách chính</label>
                          <div className="mb-2">
                            <input
                              type="text"
                              list="club-head-coach-options"
                              placeholder="Nhập ID hoặc tên HLV để tìm..."
                              value={typedClubCoachId}
                              onChange={e => {
                                const value = e.target.value;
                                setTypedClubCoachId(value);
                                const coach = findPersonByIdOrName(coaches, value);
                                setClubForm({ ...clubForm, headCoach: coach?.fullName || '' });
                                if (coach) setTypedClubCoachId(formatPersonLookupValue(coach));
                              }}
                              className="w-full text-xs sm:text-sm border border-[#0054A6]/30 p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#0054A6]"
                            />
                            <datalist id="club-head-coach-options">
                              {coaches.map(coach => (
                                <option key={coach.id} value={formatPersonLookupValue(coach)} />
                              ))}
                            </datalist>
                          </div>                          {(() => {
                            const matchedCoach = findPersonByIdOrName(coaches, typedClubCoachId) || coaches.find(c => c.fullName === clubForm.headCoach);
                            if (matchedCoach) {
                              return (
                                <div className="flex items-center gap-2 mt-2 p-1.5 bg-emerald-50 rounded-lg border border-emerald-100">
                                  {matchedCoach.photo ? (
                                    <img src={matchedCoach.photo} alt={matchedCoach.fullName} className="w-8 h-8 rounded-full object-cover border" referrerPolicy="no-referrer" />
                                  ) : (
                                    <div className="w-8 h-8 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center text-[9px] font-bold">VS</div>
                                  )}
                                  <div className="text-[10px] leading-tight text-emerald-800">
                                    <p className="font-bold">✓ Xác nhận: {matchedCoach.fullName}</p>
                                    <p className="text-[9px] text-emerald-600">ID: {matchedCoach.id} • Đẳng cấp: {matchedCoach.rank}</p>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Địa chỉ chính xác (Dùng định vị bản đồ)</label>
                          <input 
                            type="text" 
                            value={clubForm.address || ''}
                            onChange={e => setClubForm({ ...clubForm, address: e.target.value })}
                            className="w-full text-sm border p-2 rounded-lg" required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-black text-[#0054A6] uppercase mb-1">
                            Tên địa điểm đúng trên Google Maps
                          </label>
                          <input
                            type="text"
                            value={clubForm.googleMapPlaceName || ''}
                            onChange={e => setClubForm({ ...clubForm, googleMapPlaceName: e.target.value })}
                            className="w-full text-sm border p-2 rounded-lg"
                            placeholder="Ví dụ: Nhà Thiếu Nhi Quận 4"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 rounded-xl border border-blue-200 bg-blue-50/50 p-4">
                      <div>
                        <label className="block text-xs font-black text-[#0054A6] uppercase mb-1">
                          Mã nhúng Google Maps chính xác
                        </label>
                        <textarea
                          value={clubForm.googleMapUrl || ''}
                          onChange={e => setClubForm({ ...clubForm, googleMapUrl: e.target.value })}
                          className="w-full text-xs border p-2 rounded-lg bg-white font-mono"
                          rows={5}
                          placeholder={'Dán toàn bộ đoạn <iframe src="https://www.google.com/maps/embed?...">...</iframe>'}
                        />
                        <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
                          Google Maps → Chia sẻ → Nhúng bản đồ → Sao chép HTML. Đây là cách giữ đúng Nhà Thiếu Nhi Quận 4, không bị chuyển sang Công viên Quận 4 hoặc đường Khánh Hội.
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs font-black uppercase text-slate-600">Xem trước đúng vị trí sẽ hiển thị</p>
                        <div className="h-52 overflow-hidden rounded-xl border border-slate-200 bg-white">
                          <iframe
                            title="Xem trước bản đồ điểm tập"
                            src={buildGoogleMapsEmbedUrl(
                              clubForm.googleMapUrl,
                              [
                                clubForm.googleMapPlaceName || clubForm.name,
                                clubForm.address,
                                'Việt Nam'
                              ].filter(Boolean).join(', ')
                            )}
                            className="h-full w-full"
                            style={{ border: 0 }}
                            loading="lazy"
                            referrerPolicy="no-referrer-when-downgrade"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Bottom: Assistant Coaches checklist */}
                    <div className="border-t border-slate-200/80 pt-4">
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                        Chọn các huấn luyện viên phụ trách CLB (Tự động cập nhật hình ảnh và thông tin của họ)
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 border border-slate-200/80 p-3 rounded-lg bg-slate-50 max-h-48 overflow-y-auto">
                        {coaches.filter(coach => {
                          const isHeadCoach = coach.id.toLowerCase() === typedClubCoachId.trim().toLowerCase() || coach.fullName === clubForm.headCoach;
                          return !isHeadCoach;
                        }).map(coach => {
                          const isChecked = (clubForm.coachIds || []).includes(coach.id);
                          return (
                            <label key={coach.id} className="flex items-center gap-3 p-2 bg-white rounded-md border border-slate-100 hover:border-[#0054A6]/30 cursor-pointer select-none">
                              <input 
                                type="checkbox"
                                checked={isChecked}
                                onChange={e => {
                                  const currentIds = clubForm.coachIds || [];
                                  const nextIds = e.target.checked 
                                    ? [...currentIds, coach.id]
                                    : currentIds.filter(id => id !== coach.id);
                                  setClubForm({ ...clubForm, coachIds: nextIds });
                                }}
                                className="w-4 h-4 text-[#0054A6] rounded focus:ring-[#0054A6]"
                              />
                              {coach.photo ? (
                                <img src={coach.photo} alt={coach.fullName} className="w-8 h-8 rounded-full object-cover border" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-[#0054A6]/10 text-[#0054A6] font-bold text-xs flex items-center justify-center border">
                                  VS
                                </div>
                              )}
                              <div className="text-xs">
                                <p className="font-bold text-slate-800 leading-tight">{coach.fullName}</p>
                                <p className="text-[10px] text-slate-500">{coach.rank} • ID: {coach.id}</p>
                              </div>
                            </label>
                          );
                        })}
                        {coaches.filter(coach => {
                          const isHeadCoach = coach.id.toLowerCase() === typedClubCoachId.trim().toLowerCase() || coach.fullName === clubForm.headCoach;
                          return !isHeadCoach;
                        }).length === 0 && (
                          <p className="col-span-full text-center text-xs text-slate-500 py-4">Chưa có trợ lý huấn luyện viên khả dụng.</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input 
                        type="checkbox" 
                        id="club-status"
                        checked={clubForm.status !== false}
                        onChange={e => setClubForm({ ...clubForm, status: e.target.checked })}
                      />
                      <label htmlFor="club-status" className="text-sm font-semibold text-slate-700">Trạng thái hoạt động</label>
                    </div>
                  </div>
                )}

                {/* 8. HIGHLIGHTS FORM */}
                {activeTab === 'highlights' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Section: Info */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mã highlight (ID tự chọn)</label>
                          <input 
                            type="text" 
                            value={highlightForm.id || ''}
                            onChange={e => setHighlightForm({ ...highlightForm, id: e.target.value })}
                            className="w-full text-sm border p-2 rounded-lg font-mono focus:ring-1 focus:ring-[#0054A6]" required
                            placeholder="Ví dụ: HL001"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tiêu đề highlight</label>
                          <input 
                            type="text" 
                            value={highlightForm.title || ''}
                            onChange={e => setHighlightForm({ ...highlightForm, title: e.target.value })}
                            className="w-full text-sm border p-2 rounded-lg" required
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Loại truyền thông chính</label>
                          <select 
                            value={highlightForm.mediaType || 'video'}
                            onChange={e => setHighlightForm({ ...highlightForm, mediaType: e.target.value as any })}
                            className="w-full text-sm border p-2 rounded-lg" required
                          >
                            <option value="video">🎥 Video chính</option>
                            <option value="ảnh">🖼️ Bộ sưu tập hình ảnh</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tên giải đấu (chọn hoặc chỉnh sửa)</label>
                          <input
                            type="text"
                            list="highlight-saved-achievement-tournaments"
                            value={highlightForm.tournamentName || ''}
                            onChange={e => {
                              const tournamentName = e.target.value;
                              const tournament = tournaments.find(t => t.name === tournamentName);
                              setHighlightForm({
                                ...highlightForm,
                                tournamentName,
                                tournamentId: tournament?.id || ''
                              });
                            }}
                            placeholder="Chọn tên giải từ Thành tích hoặc nhập tên khác"
                            className="w-full text-sm border p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#0054A6]"
                          />
                          <datalist id="highlight-saved-achievement-tournaments">
                            {savedAchievementTournamentNames.map(name => <option key={name} value={name} />)}
                          </datalist>
                          <p className="mt-1 text-[10px] text-slate-400">Có thể chọn tên cũ rồi sửa năm hoặc bất kỳ nội dung nào.</p>
                        </div>
                      </div>

                      {/* Right Section: Athlete Lookup & Thumbnail */}
                      <div className="space-y-3">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                          <label className="block text-xs font-bold text-[#0054A6] uppercase mb-1">HLV / Thành viên biểu diễn</label>
                          <div className="mb-2">
                            <input
                              type="text"
                              list="highlight-athlete-options"
                              placeholder="Nhập ID hoặc tên HLV / thành viên để tìm..."
                              value={typedHighlightAthleteId}
                              onChange={e => {
                                const value = e.target.value;
                                setTypedHighlightAthleteId(value);
                                const person = findPersonByIdOrName([...coaches, ...members], value);
                                setHighlightForm({ ...highlightForm, athleteName: person?.fullName || '' });
                                if (person) setTypedHighlightAthleteId(formatPersonLookupValue(person));
                              }}
                              className="w-full text-xs sm:text-sm border border-[#0054A6]/30 p-2 rounded-lg bg-white outline-none focus:ring-2 focus:ring-[#0054A6]"
                            />
                            <datalist id="highlight-athlete-options">
                              {coaches.map(coach => <option key={`coach-${coach.id}`} value={formatPersonLookupValue(coach)}>HLV</option>)}
                              {members.map(member => <option key={`member-${member.id}`} value={formatPersonLookupValue(member)}>Thành viên</option>)}
                            </datalist>
                          </div>                          {(() => {
                            const matchedMember = findPersonByIdOrName(members, typedHighlightAthleteId) || members.find(m => m.fullName === highlightForm.athleteName);
                            const matchedCoach = findPersonByIdOrName(coaches, typedHighlightAthleteId) || coaches.find(c => c.fullName === highlightForm.athleteName);
                            const person = matchedMember || matchedCoach;
                            if (person) {
                              return (
                                <div className="flex items-center gap-2 mt-2 p-1.5 bg-emerald-50 rounded-lg border border-emerald-100 animate-in fade-in duration-200">
                                  {person.photo ? (
                                    <img src={person.photo} alt={person.fullName} className="w-8 h-8 rounded-full object-cover border" referrerPolicy="no-referrer" />
                                  ) : (
                                    <div className="w-8 h-8 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center text-[9px] font-bold">VS</div>
                                  )}
                                  <div className="text-[10px] leading-tight text-emerald-800">
                                    <p className="font-bold">✓ Xác nhận: {person.fullName}</p>
                                    <p className="text-[9px] text-emerald-600">ID: {person.id} • Cấp đai: {person.rank}</p>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          })()}
                        </div>
                        <div>
                          <ImageInput 
                            label="Ảnh đại diện chính (Thumbnail)"
                            value={highlightForm.thumbnail || ''}
                            onChange={val => setHighlightForm({ ...highlightForm, thumbnail: val })}
                            id="highlight-thumbnail-uploader"
                            aspectRatio="16:9"
                          />
                        </div>
                      </div>
                    </div>

                    {/* MULTIPLE MEDIA URLS MANAGEMENT */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                        <span>Quản lý các nguồn ảnh / video chi tiết ({highlightForm.mediaUrls?.length || 0})</span>
                      </h4>
                      <p className="text-[10px] text-slate-500 mb-3">
                        Ảnh từ máy sẽ được tự nén và lưu từng ảnh riêng trong Firebase. Tối đa 50 ảnh/Highlight,
                        mỗi ảnh gốc tối đa 15 MB. Video vui lòng dùng đường dẫn URL/YouTube.
                      </p>

                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        <label className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-white transition-all ${
                          isUploadingHighlightMedia
                            ? 'bg-slate-400 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
                        }`}>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            disabled={isUploadingHighlightMedia}
                            className="hidden"
                            onChange={event => {
                              const files = Array.from(event.currentTarget.files || []) as File[];
                              event.currentTarget.value = '';
                              void handleHighlightImageUpload(files);
                            }}
                          />
                          <Plus className="w-3.5 h-3.5" />
                          Chọn nhiều ảnh từ máy
                        </label>
                        <span className="text-[10px] font-semibold text-slate-500">
                          JPEG, PNG, WebP hoặc GIF • giữ độ phân giải cao, tự tối ưu dưới 650 KB/ảnh
                        </span>
                      </div>

                      {highlightUploadProgress && (
                        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-2.5">
                          <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold text-blue-800">
                            <span>Đang nén và lưu từng ảnh lên Firebase…</span>
                            <span>{highlightUploadProgress.current}/{highlightUploadProgress.total}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-blue-100">
                            <div
                              className="h-full rounded-full bg-[#0054A6] transition-all"
                              style={{
                                width: `${Math.max(
                                  4,
                                  (highlightUploadProgress.current / highlightUploadProgress.total) * 100
                                )}%`
                              }}
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="space-y-3">
                        {highlightForm.mediaUrls?.map((url, idx) => {
                          const isBase64 = url.startsWith('data:');
                          const isVideo = url.startsWith('data:video') || url.endsWith('.mp4') || url.endsWith('.webm') || url.endsWith('.ogg');
                          return (
                            <div key={idx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-[#0054A6]">TẬP TIN CHI TIẾT #{idx + 1}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const copy = [...(highlightForm.mediaUrls || [])];
                                    const noteCopy = [...(highlightForm.mediaNotes || [])];
                                    copy.splice(idx, 1);
                                    noteCopy.splice(idx, 1);
                                    setHighlightForm({ ...highlightForm, mediaUrls: copy, mediaNotes: noteCopy });
                                  }}
                                  className="text-rose-600 hover:text-rose-800 text-xs font-black uppercase"
                                >
                                  Xóa bỏ
                                </button>
                              </div>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <input 
                                  type="text"
                                  value={isBase64 ? '📁 [Tập tin đã chọn từ máy]' : url}
                                  placeholder="Dán đường dẫn URL tại đây hoặc chọn Tải từ máy..."
                                  disabled={isBase64}
                                  onChange={e => {
                                    const copy = [...(highlightForm.mediaUrls || [])];
                                    copy[idx] = e.target.value;
                                    setHighlightForm({ ...highlightForm, mediaUrls: copy });
                                  }}
                                  className="flex-1 text-xs border p-2 rounded-lg bg-slate-50/50 outline-none focus:ring-1 focus:ring-[#0054A6] disabled:bg-slate-100 disabled:text-slate-500 font-mono"
                                />
                                <div className="flex gap-1.5 flex-shrink-0">
                                  <label className="bg-blue-50 text-[#0054A6] hover:bg-blue-100 text-xs font-bold px-3 py-2 rounded-lg cursor-pointer flex items-center gap-1 transition-all">
                                    <input 
                                      type="file"
                                      accept="image/*"
                                      disabled={isUploadingHighlightMedia}
                                      className="hidden"
                                      onChange={e => {
                                        const file = e.target.files?.[0];
                                        e.target.value = '';
                                        if (file) void handleHighlightImageUpload([file], idx);
                                      }}
                                    />
                                    <span>Tải ảnh từ máy</span>
                                  </label>
                                  {isBase64 && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const copy = [...(highlightForm.mediaUrls || [])];
                                        copy[idx] = '';
                                        setHighlightForm({ ...highlightForm, mediaUrls: copy });
                                      }}
                                      className="bg-slate-100 text-slate-600 hover:bg-slate-200 text-xs font-bold px-2.5 py-2 rounded-lg"
                                    >
                                      Xóa file/Nhập URL
                                    </button>
                                  )}
                                </div>
                              </div>
                              <div>
                                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                                  Ghi chú cho tập tin #{idx + 1}
                                </label>
                                <textarea
                                  rows={2}
                                  value={highlightForm.mediaNotes?.[idx] || ''}
                                  onChange={e => {
                                    const noteCopy = [...(highlightForm.mediaNotes || [])];
                                    while (noteCopy.length <= idx) noteCopy.push('');
                                    noteCopy[idx] = e.target.value;
                                    setHighlightForm({ ...highlightForm, mediaNotes: noteCopy });
                                  }}
                                  placeholder="Nhập nội dung, địa điểm, thời gian hoặc mô tả riêng cho ảnh/video này..."
                                  className="w-full text-xs border border-slate-200 p-2 rounded-lg bg-white outline-none focus:ring-1 focus:ring-[#0054A6] resize-y"
                                />
                              </div>
                              {/* Preview area */}
                              {url && (
                                <div className="flex items-center gap-2 pt-1.5 border-t border-slate-100 mt-1">
                                  {isVideo ? (
                                    <div className="text-[10px] text-purple-600 font-bold flex items-center gap-1.5">
                                      <span>🎥 Xem trước video:</span>
                                      <video src={url} className="w-20 h-12 object-cover rounded border bg-black" controls />
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1.5">
                                      <span>🖼️ Xem trước ảnh:</span>
                                      <img src={url} alt="Preview" className="w-12 h-12 object-cover rounded border bg-slate-50" referrerPolicy="no-referrer" />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setHighlightForm({ 
                            ...highlightForm, 
                            mediaUrls: [...(highlightForm.mediaUrls || []), ''],
                            mediaNotes: [...(highlightForm.mediaNotes || []), '']
                          });
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 bg-[#0054A6] hover:bg-blue-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" /> Thêm ô nhập URL ảnh/video
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="hl-status"
                        checked={highlightForm.status !== false}
                        onChange={e => setHighlightForm({ ...highlightForm, status: e.target.checked })}
                      />
                      <label htmlFor="hl-status" className="text-sm font-semibold text-slate-700">Trạng thái hiển thị hoạt động</label>
                    </div>
                  </div>
                )}

                {/* Submits and resets */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t">
                  <button 
                    type="button" 
                    onClick={() => setIsEditing(false)}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button 
                    type="submit"
                    className="flex items-center gap-2 bg-[#0054A6] hover:bg-blue-800 text-white text-xs font-bold px-5 py-2 rounded-xl transition-all shadow cursor-pointer"
                  >
                    <Save className="w-4 h-4 text-[#FFF200]" />
                    <span>Lưu Dữ Liệu</span>
                  </button>
                </div>

              </form>
            </div>
          )}

          {isCrudTab && !isEditing && (
            /* ========================================================= */
            /* TABLE / GRID DATAGRID VIEW WITH ALPHABETICAL SEARCH       */
            /* ========================================================= */
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
              
              {/* Header Title & Add Trigger */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-4 mb-6">
                <div>
                  <h2 className="text-lg font-black text-[#0054A6] uppercase tracking-tight">
                    {
                      activeTab === 'articles' ? 'Danh sách Bài viết' :
                      activeTab === 'categories' ? 'Danh sách Danh mục' :
                      activeTab === 'coaches' ? 'Đội ngũ Huấn luyện viên' :
                      activeTab === 'members' ? 'Danh sách Thành viên CLB' :
                      activeTab === 'achievements' ? 'Bảng vàng Thành tích' :
                      activeTab === 'tournaments' ? 'Tổng hợp Giải đấu' :
                      activeTab === 'clubs' ? 'Hệ thống Câu lạc bộ' : 'Thư viện Highlights'
                    }
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Tìm thấy <span className="font-bold text-[#0054A6]">{renderedData.length}</span> bản ghi trong hệ thống
                  </p>
                </div>
                
                <button
                  onClick={openNewForm}
                  className="inline-flex items-center gap-2 bg-[#0054A6] hover:bg-blue-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md cursor-pointer border border-[#FFF200]"
                >
                  <Plus className="w-4 h-4 text-[#FFF200]" />
                  <span>Thêm mục mới</span>
                </button>
              </div>

              {/* One smart search input for every data table */}
              <SmartSearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                options={adminSearchOptions}
                placeholder="Tìm thông minh theo ID, tên, năm, giải đấu hoặc nội dung bạn nhớ..."
                ariaLabel="Tìm kiếm thông minh trong bảng quản trị"
                resultCount={renderedData.length}
                helperText="Không phân biệt dấu hoặc chữ hoa/thường. Bấm mũi tên để xem toàn bộ bản ghi; có thể nhập nhiều ý như 2026 Thiện vàng."
                theme="admin"
                className="mb-6 max-w-3xl"
              />

              {/* Data Table */}
              <div className="overflow-x-auto border rounded-xl">
                {renderedData.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    Không có dữ liệu phù hợp với tìm kiếm hoặc bộ lọc hiện tại.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                        <th className="p-3">ID</th>
                        {activeTab === 'members' && <th className="p-3">Thứ tự hiển thị</th>}
                        <th className="p-3">Thông tin chính</th>
                        {activeTab === 'articles' && <th className="p-3">Danh mục / Ngày đăng</th>}
                        {activeTab === 'articles' && <th className="p-3">Lượt xem</th>}
                        {activeTab === 'coaches' && <th className="p-3">Đẳng cấp / Kinh nghiệm</th>}
                        {activeTab === 'members' && <th className="p-3">Năm sinh / Đai đẳng</th>}
                        {activeTab === 'achievements' && <th className="p-3">Huy chương / Ngày</th>}
                        {activeTab === 'tournaments' && <th className="p-3">Thời gian / Địa điểm</th>}
                        {activeTab === 'clubs' && <th className="p-3">Võ sư phụ trách / Lịch tập</th>}
                        {activeTab === 'highlights' && <th className="p-3">Loại truyền thông</th>}
                        <th className="p-3">Trạng thái</th>
                        <th className="p-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700 text-xs">
                      {pagedRenderedData.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-all">
                          <td className="p-3 font-bold text-slate-400">
                            #{item.id}
                          </td>
                          {activeTab === 'members' && (
                            <td className="p-3 font-black text-[#0054A6]">
                              {item.displayOrder ?? '—'}
                            </td>
                          )}
                          <td className="p-3">
                            <div className="flex items-center gap-3">
                              {/* Thumbnail check */}
                              {(item.photo || item.image || item.thumbnail) && (
                                <img 
                                  src={item.photo || item.image || item.thumbnail} 
                                  alt="" 
                                  className="w-10 h-10 object-cover rounded-lg border bg-slate-100"
                                  loading="lazy"
                                  decoding="async"
                                  referrerPolicy="no-referrer"
                                />
                              )}
                              <div>
                                <h4 className="font-bold text-slate-800 line-clamp-1">
                                  {item.title || item.fullName || item.name}
                                </h4>
                                {(item.description || item.address || item.athleteName) && (
                                  <span className="text-[10px] text-slate-400 block line-clamp-1">
                                    {item.description || item.address || item.athleteName}
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Extra Dynamic Columns depending on Tab */}
                          {activeTab === 'articles' && (
                            <>
                              <td className="p-3">
                                <span className="font-semibold block text-slate-700">{categories.find(c => c.id === item.categoryId)?.name || 'Chưa phân loại'}</span>
                                <span className="text-[10px] text-slate-400 block">{item.date}</span>
                              </td>
                              <td className="p-3 text-slate-600 font-semibold">
                                {item.views} views
                              </td>
                            </>
                          )}

                          {activeTab === 'coaches' && (
                            <td className="p-3">
                              <span className="font-bold text-blue-700 block">{item.rank}</span>
                              <span className="text-[10px] font-semibold text-teal-600 block">🏫 {clubs.find(c => c.id === item.clubId)?.name || 'Chưa phân CLB'}</span>
                              <span className="text-[10px] text-slate-400 line-clamp-1">{item.experience}</span>
                            </td>
                          )}

                          {activeTab === 'members' && (
                            <td className="p-3">
                              <span className="font-semibold text-emerald-700 block">{item.rank}</span>
                              <span className="text-[10px] font-semibold text-teal-600 block">🏫 {clubs.find(c => c.id === item.clubId)?.name || 'Chưa phân CLB'}</span>
                              <span className="text-[10px] text-slate-400">Sinh năm: {item.birthYear}</span>
                            </td>
                          )}

                          {activeTab === 'achievements' && (
                            <td className="p-3">
                              <span className="font-black text-amber-600 block">🏅 Huy chương {item.medalType}</span>
                              <span className="text-[10px] text-slate-400">{item.date}</span>
                            </td>
                          )}

                          {activeTab === 'tournaments' && (
                            <td className="p-3">
                              <span className="font-semibold text-slate-700 block">{item.date}</span>
                              <span className="text-[10px] text-slate-400 line-clamp-1">{item.location}</span>
                            </td>
                          )}

                          {activeTab === 'clubs' && (
                            <td className="p-3">
                              <span className="font-semibold block text-slate-700">{item.headCoach}</span>
                              <span className="text-[10px] text-slate-400 block">{item.trainingDays}</span>
                              <span className="text-[10px] text-[#0054A6] font-bold">{item.trainingHours}</span>
                            </td>
                          )}

                          {activeTab === 'highlights' && (
                            <td className="p-3">
                              <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                item.mediaType === 'video' ? 'bg-purple-100 text-purple-700' : 'bg-teal-100 text-teal-700'
                              }`}>
                                {item.mediaType} ({item.mediaUrls?.length || 1})
                              </span>
                            </td>
                          )}

                          <td className="p-3">
                            {/* Standard active or visible status indicator */}
                            {item.status === 'đang diễn ra' ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-black text-[9px] uppercase">Đang diễn ra</span>
                            ) : item.status === 'sắp diễn ra' ? (
                              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full font-black text-[9px] uppercase">Sắp diễn ra</span>
                            ) : item.status === 'đã kết thúc' ? (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full font-black text-[9px] uppercase">Đã kết thúc</span>
                            ) : (activeTab === 'coaches' || activeTab === 'members' || activeTab === 'clubs') ? (
                              (item.status === true || item.status === undefined) ? (
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-bold text-[9px] uppercase">Hoạt động</span>
                              ) : (
                                <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-full font-bold text-[9px] uppercase">Ngưng hoạt động</span>
                              )
                            ) : (item.status === true || item.status === undefined) ? (
                              <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full font-semibold text-[9px] uppercase">Hiển thị</span>
                            ) : (
                              <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-full font-semibold text-[9px] uppercase">Đang Ẩn</span>
                            )}
                          </td>

                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setViewDetailItem({ tab: activeTab, data: item })}
                                className="p-1.5 bg-slate-50 text-slate-700 hover:bg-slate-150 rounded-lg transition-all cursor-pointer"
                                title="Xem chi tiết"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleEditClick(activeTab, item)}
                                className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg transition-all cursor-pointer"
                                title="Sửa thông tin"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(activeTab, item.id)}
                                className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-all cursor-pointer"
                                title="Xóa"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {crudPageCount > 1 && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <span className="text-slate-500">
                    Trang <strong className="text-[#0054A6]">{crudPage}</strong> / {crudPageCount}
                    {' '}• tối đa {CRUD_PAGE_SIZE} bản ghi mỗi trang
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCrudPage(page => Math.max(1, page - 1))}
                      disabled={crudPage === 1}
                      className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Trước
                    </button>
                    <button
                      type="button"
                      onClick={() => setCrudPage(page => Math.min(crudPageCount, page + 1))}
                      disabled={crudPage === crudPageCount}
                      className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Sau
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      </div>

      {/* Admin Item Detail Modal popup */}
      {viewDetailItem && (
        <AdminItemDetailModal 
          tab={viewDetailItem.tab} 
          item={viewDetailItem.data} 
          categories={categories} 
          achievements={achievements}
          clubs={clubs}
          members={members}
          onClose={() => setViewDetailItem(null)} 
        />
      )}

      {/* Toast Alert Notification */}
      {toast && (
        <div className="fixed top-24 right-6 z-55 animate-in fade-in slide-in-from-top-5 duration-300" id="toast-admin-notification">
          <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-xs font-black uppercase tracking-wider ${
            toast.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-emerald-900/10' 
              : toast.type === 'error' 
                ? 'bg-rose-50 text-rose-800 border-rose-200 shadow-rose-900/10' 
                : 'bg-blue-50 text-blue-800 border-blue-200 shadow-blue-900/10'
          }`}>
            <span className="text-base">
              {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
            </span>
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-55 flex items-center justify-center p-4" id="modal-delete-confirm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-4">
              <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center text-rose-500 mx-auto">
                <Trash2 className="w-5 h-5 animate-bounce" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">Xác nhận xóa dữ liệu?</h3>
                <p className="text-xs text-slate-500 font-sans leading-relaxed">
                  Bạn có thực sự muốn xóa mục <strong className="text-rose-600">"{deleteConfirm.name}"</strong>? Hành động này sẽ không thể hoàn tác.
                </p>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleConfirmDelete}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold py-2.5 rounded-xl shadow-lg shadow-rose-600/10 transition-all cursor-pointer"
                >
                  Xóa vĩnh viễn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
