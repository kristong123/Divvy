import clsx from 'clsx';

const Notifications: React.FC = () => {
  const container = clsx(
    // Spacing
    'p-4 pt-0'
  );

  const title = clsx(
    // Typography
    'text-sm font-bold text-black'
  );

  return (
    <div className={container}>
      <p className={title}>Notifications</p>
      {/* Add notification content here */}
    </div>
  );
};

export default Notifications;
