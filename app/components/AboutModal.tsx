'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from '../lib/LanguageContext';

export function AboutModal() {
  const { t, lang } = useTranslation();
  const [open, setOpen] = useState(false);
  const [returnBase, setReturnBase] = useState('');

  useEffect(() => {
    setReturnBase(window.location.origin + window.location.pathname);
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t.aboutTitle}
        className="flex items-center justify-center w-9 h-9 rounded-full border border-pink-800 text-lg transition-all hover:border-pink-400 hover:shadow-[0_0_10px_2px_rgba(236,72,153,0.4)] cursor-pointer"
      >
        ❤️
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="relative w-full max-w-sm mx-4 bg-gray-900 border border-gray-700 rounded-2xl px-8 py-8 text-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-3 right-4 text-gray-500 hover:text-gray-300 text-lg leading-none cursor-pointer"
            >
              ✕
            </button>

            <h2 className="text-lg font-bold mb-2">{t.aboutTitle}</h2>
            <p className="text-gray-400 text-sm mb-6">{t.aboutDescription}</p>

            <div>
              <p className="text-gray-400 text-sm mb-4">{t.donateLabel}</p>
              <div className="flex justify-center">
                <form
                  action="https://www.paypal.com/donate"
                  method="post"
                  target="_top"
                >
                  <input type="hidden" name="hosted_button_id" value={lang === 'pt' ? '2QH5DJT2M4L96' : '5872ZFKK2WUNC'} />
                  {returnBase && (
                    <>
                      <input type="hidden" name="return" value={`${returnBase}?donation=done`} />
                      <input type="hidden" name="cancel_return" value={`${returnBase}?donation=canceled`} />
                    </>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <input
                    type="image"
                    src={lang === 'pt'
                      ? 'https://www.paypalobjects.com/pt_BR/i/btn/btn_donate_LG.gif'
                      : 'https://www.paypalobjects.com/en_US/i/btn/btn_donate_LG.gif'}
                    name="submit"
                    title="PayPal - The safer, easier way to pay online!"
                    alt={lang === 'pt' ? 'Faça doações com o botão do PayPal' : 'Donate with the PayPal button'}
                    className="cursor-pointer"
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    alt=""
                    src={lang === 'pt'
                      ? 'https://www.paypal.com/pt_BR/i/scr/pixel.gif'
                      : 'https://www.paypal.com/en_US/i/scr/pixel.gif'}
                    width={1}
                    height={1}
                  />
                </form>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}
