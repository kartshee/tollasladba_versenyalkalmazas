import { useRouter } from '../router/router.jsx';

export function AppLink({ to, children, className = '', title, ...props }) {
  const { navigate } = useRouter();

  return (
    <a
      href={to}
      className={className}
      title={title}
      onClick={(event) => {
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          props.target === '_blank' ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey
        ) {
          return;
        }
        event.preventDefault();
        navigate(to);
      }}
      {...props}
    >
      {children}
    </a>
  );
}
