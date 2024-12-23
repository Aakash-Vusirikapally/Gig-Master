import type { LoaderFunction } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { Outlet } from '@remix-run/react';
import { getUser } from '~/session.server';

export const loader: LoaderFunction = async ({ request }) => {
  const user = await getUser(request);
  if (user) return redirect('/');

  return null;
};

export default function AuthLayout() {
  return (
    <main
      className="h-screen bg-cover bg-center flex flex-col items-center justify-center"
      style={{
        backgroundImage:
          'url(https://images.pexels.com/photos/167636/pexels-photo-167636.jpeg?cs=srgb&dl=pexels-thibault-trillet-44912-167636.jpg&fm=jpg)',
      }}
    >
      {/* Title and Subline */}
      <div className="text-center mb-8">
        <h1 className="text-5xl font-bold text-white">GigMaster</h1>
        <p className="text-lg text-gray-300">Your gateway to the best events.</p>
      </div>

      {/* Dashboard */}
      <div className="w-full max-w-md bg-white/90 p-8 rounded-lg shadow-lg">
        <Outlet />
      </div>
    </main>
  );
}
