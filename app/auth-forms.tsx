export function LoginForm({
  action,
  children,
}: {
  action: any;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      className="flex flex-col space-y-4 bg-gray-50 px-4 py-8 sm:px-16"
    >
      <div>
        <label
          htmlFor="email"
          className="block text-xs text-gray-600 uppercase font-medium"
        >
          邮箱
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="your@email.com"
          autoComplete="email"
          required
          className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-xs text-gray-600 uppercase font-medium"
        >
          密码
        </label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="••••••"
          required
          className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      {children}
    </form>
  );
}

export function RegisterForm({
  action,
  children,
}: {
  action: any;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      className="flex flex-col space-y-4 bg-gray-50 px-4 py-8 sm:px-16"
    >
      <div>
        <label
          htmlFor="username"
          className="block text-xs text-gray-600 uppercase font-medium"
        >
          用户名
        </label>
        <input
          id="username"
          name="username"
          type="text"
          placeholder="您的用户名"
          autoComplete="username"
          required
          className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label
          htmlFor="email"
          className="block text-xs text-gray-600 uppercase font-medium"
        >
          邮箱
        </label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="your@email.com"
          autoComplete="email"
          required
          className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      <div>
        <label
          htmlFor="password"
          className="block text-xs text-gray-600 uppercase font-medium"
        >
          密码
        </label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="至少6个字符"
          required
          minLength={6}
          className="mt-1 block w-full appearance-none rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
        />
      </div>
      {children}
    </form>
  );
}
