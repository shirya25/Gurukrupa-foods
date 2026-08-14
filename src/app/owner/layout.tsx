import OwnerNav from './OwnerNav';

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <OwnerNav />
      <main>{children}</main>
    </>
  );
}
