export default function WhatsappButton({
  numero,
  mensagem,
  texto = 'Falar com o vendedor',
  variante,
  className = '',
}) {
  const telefone = String(numero || '').replace(/\D/g, '');

  const url = `https://wa.me/${telefone}?text=${encodeURIComponent(
    mensagem || ''
  )}`;

  const classes = ['whatsapp-btn', className].filter(Boolean).join(' ');

  return (
    <a
      className={classes}
      href={url}
      target="_blank"
      rel="noreferrer"
      data-variante={variante}
    >
      <svg
        className="icone-whatsapp whatsapp-icone-vetorial"
        viewBox="0 0 32 32"
        aria-hidden="true"
        focusable="false"
      >
        <path
          d="M16 3.2a12.2 12.2 0 0 0-10.5 18.4L4 28l6.6-1.7A12.2 12.2 0 1 0 16 3.2Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        <path
          d="M12.1 9.4c-.3-.6-.6-.6-.9-.6h-.7c-.3 0-.7.1-1 .5-.4.4-1.3 1.3-1.3 3.1s1.3 3.5 1.5 3.7c.2.3 2.6 4.1 6.3 5.6 3.1 1.2 3.7 1 4.4.9.7-.1 2.2-.9 2.5-1.8.3-.9.3-1.6.2-1.8-.1-.2-.4-.3-.8-.5l-2.5-1.2c-.3-.1-.6-.2-.8.2-.2.4-.9 1.2-1.1 1.5-.2.2-.4.3-.8.1-.4-.2-1.6-.6-3-1.9-1.1-1-1.9-2.2-2.1-2.6-.2-.4 0-.6.2-.8l.6-.7c.2-.2.3-.4.4-.6.1-.2 0-.5 0-.7l-1.1-2.4Z"
          fill="currentColor"
        />
      </svg>

      <span>{texto}</span>
    </a>
  );
}
