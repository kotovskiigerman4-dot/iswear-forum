CyberEditor.tsx// @ts-nocheck
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Bold, Italic, List, Heading1, Heading2, Image as ImageIcon, Link as LinkIcon, Type } from "lucide-react";

export default function CyberEditor({ value, onChange }) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ 
        HTMLAttributes: { 
          class: 'max-w-full border-2 border-primary/20 my-4 shadow-[0_0_15px_rgba(0,255,159,0.2)]' 
        } 
      }),
      Link.configure({ openOnClick: false }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none focus:outline-none min-h-[300px] p-4 font-mono text-sm bg-black/60 border border-primary/30 text-primary/90',
      },
    },
  });

  if (!editor) return null;

  const addImage = () => {
    const url = window.prompt('Введите URL изображения (прямая ссылка):');
    if (url) editor.chain().focus().setImage({ src: url }).run();
  };

  return (
    <div className="w-full border border-primary/40 bg-black/20 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 bg-primary/10 border-b border-primary/30">
        <button 
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} 
          className={`p-2 border ${editor.isActive('heading', { level: 1 }) ? 'bg-primary text-black' : 'border-transparent text-primary hover:bg-primary/20'}`}
        >
          <Heading1 size={16}/>
        </button>
        <button 
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} 
          className={`p-2 border ${editor.isActive('heading', { level: 2 }) ? 'bg-primary text-black' : 'border-transparent text-primary hover:bg-primary/20'}`}
        >
          <Heading2 size={16}/>
        </button>
        <div className="w-[1px] bg-primary/30 mx-1" />
        <button 
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()} 
          className={`p-2 border ${editor.isActive('bold') ? 'bg-primary text-black' : 'border-transparent text-primary hover:bg-primary/20'}`}
        >
          <Bold size={16}/>
        </button>
        <button 
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()} 
          className={`p-2 border ${editor.isActive('italic') ? 'bg-primary text-black' : 'border-transparent text-primary hover:bg-primary/20'}`}
        >
          <Italic size={16}/>
        </button>
        <button 
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()} 
          className={`p-2 border ${editor.isActive('bulletList') ? 'bg-primary text-black' : 'border-transparent text-primary hover:bg-primary/20'}`}
        >
          <List size={16}/>
        </button>
        <div className="w-[1px] bg-primary/30 mx-1" />
        <button 
          type="button"
          onClick={addImage} 
          className="p-2 border border-transparent text-primary hover:bg-primary/20"
        >
          <ImageIcon size={16}/>
        </button>
      </div>
      
      <EditorContent editor={editor} />
      
      <div className="p-1 bg-primary/5 text-[8px] font-mono text-primary/40 text-right uppercase tracking-widest">
        Cyber_Text_Protocol_v1.0
      </div>
    </div>
  );
}
