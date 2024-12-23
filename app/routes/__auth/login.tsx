import { Button, PasswordInput, SegmentedControl, TextInput } from '@mantine/core';
import type { ActionFunction } from '@remix-run/node';
import { Link, useFetcher } from '@remix-run/react';
import { Lock } from 'lucide-react';
import * as React from 'react';
import { verifyLogin } from '~/lib/user.server';
import { LoginSchema } from '~/lib/zod.schema';
import { createUserSession } from '~/session.server';
import { Role } from '~/utils/constants';
import { badRequest, safeRedirect } from '~/utils/misc.server';
import type { inferErrors } from '~/utils/validation';
import { validateAction } from '~/utils/validation';

interface ActionData {
  fieldErrors?: inferErrors<typeof LoginSchema>;
}

export const action: ActionFunction = async ({ request }) => {
  const { fieldErrors, fields } = await validateAction(request, LoginSchema);

  if (fieldErrors) {
    return badRequest<ActionData>({ fieldErrors });
  }

  const { email, password, redirectTo, remember, role } = fields;

  const user = await verifyLogin({ email, password, role: role as Role });

  if (!user) {
    return badRequest<ActionData>({
      fieldErrors: {
        password: 'Invalid username or password',
      },
    });
  }

  return createUserSession({
    request,
    userId: user.id,
    role: role as unknown as Role,
    remember: remember === 'on' ? true : false,
    redirectTo: safeRedirect(redirectTo),
  });
};

export default function Login() {
  const fetcher = useFetcher<ActionData>();
  const isSubmitting = fetcher.state !== 'idle';

  const [role, setRole] = React.useState<Role>(Role.AUDIENCE);

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-center">Welcome back!</h2>
      <p className="text-center text-gray-600 mb-6">Enter your credentials below to continue</p>
      <fetcher.Form
        method="post"
        className="space-y-4"
        style={{
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <SegmentedControl
          fullWidth
          name="role"
          value={role}
          onChange={(val) => setRole(val as Role)}
          data={[
            { label: 'Audience', value: 'audience' },
            { label: 'Admin', value: 'admin' },
          ]}
        />
        <TextInput
          type="email"
          name="email"
          placeholder="Enter your email"
          error={fetcher.data?.fieldErrors?.email}
          required
        />
        <PasswordInput
          name="password"
          placeholder="Enter your password"
          error={fetcher.data?.fieldErrors?.password}
          required
        />
        <div className="flex justify-end text-sm">
          {role === Role.AUDIENCE && (
            <Link
              to="/register"
              prefetch="intent"
              className="font-semibold text-blue-500 hover:underline"
            >
              Register?
            </Link>
          )}
        </div>
        <Button
          fullWidth
          type="submit"
          loading={isSubmitting}
          leftIcon={<Lock size={16} />}
          className="bg-blue-500 text-white"
        >
          Login
        </Button>
      </fetcher.Form>
    </div>
  );
}
