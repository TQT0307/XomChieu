import React, { useEffect, useRef, useState } from 'react';
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  RemoveFormatting,
  Underline,
  Undo2,
} from 'lucide-react';
import {
  articleContentToEditorHtml,
  sanitizeArticleHtml,
} from '../utils/articleContent';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  compact?: boolean;
}

type EditorButtonProps = {
  label: string;
  onRun: () => void;
  children: React.ReactNode;
};

const EditorButton = ({ label, onRun, children }: EditorButtonProps) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    onMouseDown={event => {
      event.preventDefault();
      onRun();
    }}
    className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-slate-200 bg-white px-2 text-slate-600 transition-colors hover:border-[#0054A6] hover:bg-blue-50 hover:text-[#0054A6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0054A6]"
  >
    {children}
  </button>
);

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Nhập nội dung bài viết...',
  ariaLabel = 'Nội dung bài viết',
  compact = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const emitContent = (sanitize = false) => {
    const editor = editorRef.current;
    if (!editor) return;
    const nextValue = sanitize ? sanitizeArticleHtml(editor.innerHTML) : editor.innerHTML;
    if (sanitize && nextValue !== editor.innerHTML) editor.innerHTML = nextValue;
    setIsEmpty(!(editor.textContent || '').trim() && !editor.querySelector('img,hr'));
    onChange(nextValue);
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const nextHtml = articleContentToEditorHtml(value);
    if (editor.innerHTML !== nextHtml) editor.innerHTML = nextHtml;
    setIsEmpty(!(editor.textContent || '').trim() && !editor.querySelector('img,hr'));
  }, [value]);

  const saveSelection = () => {
    const editor = editorRef.current;
    const selection = window.getSelection();
    if (!editor || !selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  };

  const restoreSelection = () => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    const selection = window.getSelection();
    if (!selection || !savedRangeRef.current) return;
    selection.removeAllRanges();
    selection.addRange(savedRangeRef.current);
  };

  const runCommand = (command: string, commandValue?: string) => {
    restoreSelection();
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(command, false, commandValue);
    saveSelection();
    emitContent();
  };

  const insertLink = () => {
    const link = window.prompt('Nhập đường dẫn liên kết (https://...)');
    if (!link) return;
    runCommand('createLink', link);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm focus-within:border-[#0054A6] focus-within:ring-2 focus-within:ring-blue-100">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-slate-200 bg-slate-50 p-2">
        <select
          aria-label="Kiểu đoạn văn"
          title="Kiểu đoạn văn"
          defaultValue="p"
          onMouseDown={saveSelection}
          onChange={event => {
            runCommand('formatBlock', event.target.value);
            event.target.value = 'p';
          }}
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700"
        >
          <option value="p">Đoạn văn</option>
          <option value="h2">Tiêu đề lớn</option>
          <option value="h3">Tiêu đề nhỏ</option>
          <option value="blockquote">Trích dẫn</option>
        </select>

        <select
          aria-label="Kiểu chữ"
          title="Kiểu chữ"
          defaultValue="Inter"
          onMouseDown={saveSelection}
          onChange={event => runCommand('fontName', event.target.value)}
          className="h-8 max-w-32 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700"
        >
          <option value="Inter">Inter</option>
          <option value="Arial">Arial</option>
          <option value="Georgia">Georgia</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Verdana">Verdana</option>
          <option value="Tahoma">Tahoma</option>
        </select>

        <select
          aria-label="Cỡ chữ"
          title="Cỡ chữ"
          defaultValue="3"
          onMouseDown={saveSelection}
          onChange={event => runCommand('fontSize', event.target.value)}
          className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-bold text-slate-700"
        >
          <option value="2">12</option>
          <option value="3">16</option>
          <option value="4">18</option>
          <option value="5">24</option>
          <option value="6">32</option>
          <option value="7">48</option>
        </select>

        <label className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-600" title="Màu chữ">
          Chữ
          <input
            type="color"
            defaultValue="#1e293b"
            aria-label="Màu chữ"
            onMouseDown={saveSelection}
            onChange={event => runCommand('foreColor', event.target.value)}
            className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
          />
        </label>

        <label className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-bold text-slate-600" title="Màu nền chữ">
          Nền
          <input
            type="color"
            defaultValue="#fff2a8"
            aria-label="Màu nền chữ"
            onMouseDown={saveSelection}
            onChange={event => runCommand('hiliteColor', event.target.value)}
            className="h-5 w-6 cursor-pointer border-0 bg-transparent p-0"
          />
        </label>
        <span className="mx-0.5 h-6 w-px bg-slate-200" />
        <EditorButton label="In đậm" onRun={() => runCommand('bold')}><Bold className="h-4 w-4" /></EditorButton>
        <EditorButton label="In nghiêng" onRun={() => runCommand('italic')}><Italic className="h-4 w-4" /></EditorButton>
        <EditorButton label="Gạch chân" onRun={() => runCommand('underline')}><Underline className="h-4 w-4" /></EditorButton>
        <EditorButton label="Trích dẫn" onRun={() => runCommand('formatBlock', 'blockquote')}><Quote className="h-4 w-4" /></EditorButton>

        <span className="mx-0.5 h-6 w-px bg-slate-200" />
        <EditorButton label="Danh sách dấu chấm" onRun={() => runCommand('insertUnorderedList')}><List className="h-4 w-4" /></EditorButton>
        <EditorButton label="Danh sách đánh số" onRun={() => runCommand('insertOrderedList')}><ListOrdered className="h-4 w-4" /></EditorButton>
        <EditorButton label="Giảm thụt dòng" onRun={() => runCommand('outdent')}><IndentDecrease className="h-4 w-4" /></EditorButton>
        <EditorButton label="Tăng thụt dòng" onRun={() => runCommand('indent')}><IndentIncrease className="h-4 w-4" /></EditorButton>

        <span className="mx-0.5 h-6 w-px bg-slate-200" />
        <EditorButton label="Căn trái" onRun={() => runCommand('justifyLeft')}><AlignLeft className="h-4 w-4" /></EditorButton>
        <EditorButton label="Căn giữa" onRun={() => runCommand('justifyCenter')}><AlignCenter className="h-4 w-4" /></EditorButton>
        <EditorButton label="Căn phải" onRun={() => runCommand('justifyRight')}><AlignRight className="h-4 w-4" /></EditorButton>
        <EditorButton label="Căn đều hai bên" onRun={() => runCommand('justifyFull')}><AlignJustify className="h-4 w-4" /></EditorButton>

        <span className="mx-0.5 h-6 w-px bg-slate-200" />
        <EditorButton label="Thêm liên kết" onRun={insertLink}><Link2 className="h-4 w-4" /></EditorButton>
        <EditorButton label="Xóa định dạng" onRun={() => runCommand('removeFormat')}><RemoveFormatting className="h-4 w-4" /></EditorButton>
        <EditorButton label="Hoàn tác" onRun={() => runCommand('undo')}><Undo2 className="h-4 w-4" /></EditorButton>
        <EditorButton label="Làm lại" onRun={() => runCommand('redo')}><Redo2 className="h-4 w-4" /></EditorButton>
      </div>

      <div className="relative">
        {isEmpty && (
          <span className="pointer-events-none absolute left-4 top-3 text-sm text-slate-400">
            {placeholder}
          </span>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-label={ariaLabel}
          onInput={() => emitContent()}
          onMouseUp={saveSelection}
          onKeyUp={saveSelection}
          onFocus={saveSelection}
          onBlur={() => emitContent(true)}
          className={`rich-text-editor detail-scrollbar max-h-[32rem] overflow-y-auto px-4 py-3 text-sm text-slate-800 outline-none ${compact ? 'min-h-36' : 'min-h-64'}`}
        />
      </div>
      <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-[10px] text-slate-500">
        Có thể chọn kiểu chữ, cỡ chữ, màu chữ, tô nền, tiêu đề, danh sách, trích dẫn, căn lề và thụt dòng như trình soạn thảo bài báo.
      </div>
    </div>
  );
}
