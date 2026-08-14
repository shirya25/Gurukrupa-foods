import NavBar from '@/components/NavBar';

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar />
      <main>{children}</main>
    </>
  );
}
