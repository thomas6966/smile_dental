import { useRef, useState } from 'react';
import { ImageUp, X } from 'lucide-react';
import { api } from '../api.js';
import { Spinner, useUI } from '../ui.jsx';

export default function ImageInput({ value, onChange, label = 'Rasm' }) {
  const { toast } = useUI();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file) => {
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    setUploading(true);
    try {
      const res = await api('/upload', { method: 'POST', form });
      onChange(res.url);
      toast('Rasm yuklandi');
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="field">
      <label>{label}</label>
      <div className="row">
        {value ? <img className="image-preview" src={value} alt="" /> : <div className="image-preview" />}
        <div className="grow stack" style={{ gap: 6 }}>
          <input className="input" placeholder="https://... yoki faylni yuklang" value={value || ''} onChange={(e) => onChange(e.target.value)} />
          <div className="row">
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
              {uploading ? <Spinner size={14} /> : <ImageUp size={14} />} Kompyuterdan yuklash
            </button>
            {value && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange('')}>
                <X size={14} /> Olib tashlash
              </button>
            )}
          </div>
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => upload(e.target.files?.[0])} />
    </div>
  );
}
