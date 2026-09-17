export default function UserAvatar({ user, large = false, className = '' }) {
  const classes = `avatar${large ? ' large' : ''} ${className}`.trim();

  if (user?.avatarDataUrl) {
    return <img className={`${classes} object-cover`} src={user.avatarDataUrl} alt={`${user.name || 'User'} profile`} />;
  }

  return <div className={classes} aria-hidden="true">{user?.name?.slice(0, 1)?.toUpperCase() || '?'}</div>;
}
