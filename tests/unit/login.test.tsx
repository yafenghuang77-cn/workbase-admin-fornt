import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';

import { LoginPage } from '@/pages/login';
import { AppProviders } from '@/providers/AppProviders';

const renderLogin = () => render(<LoginPage />, { wrapper: AppProviders });
const submitButtonName = /^登\s*录$/u;

afterEach(() => {
  window.localStorage.clear();
});

test('空表单提交时提示账号和密码是必填项', async () => {
  const user = userEvent.setup();
  renderLogin();

  await user.click(screen.getByRole('button', { name: submitButtonName }));

  expect(await screen.findByText('请输入账号')).toBeInTheDocument();
  expect(await screen.findByText('请输入密码')).toBeInTheDocument();
});

test.each([
  ['纯空格', '   ', '请输入账号'],
  ['超过 64 个字符', 'a'.repeat(65), '账号不能超过 64 个字符'],
])('账号为%s时失焦提示校验错误', async (_scenario, username, message) => {
  const user = userEvent.setup();
  renderLogin();

  await user.type(screen.getByRole('textbox', { name: '账号' }), username);
  await user.tab();

  expect(await screen.findByText(message)).toBeInTheDocument();
  expect(screen.getByRole('textbox', { name: '账号' })).toHaveAttribute('aria-invalid', 'true');
});

test('64 字符账号可提交，等待结果时重复点击只保存一次', async () => {
  const username = 'a'.repeat(64);
  const save = vi.spyOn(Storage.prototype, 'setItem');
  const user = userEvent.setup();
  renderLogin();
  await user.type(screen.getByRole('textbox', { name: '账号' }), username);
  await user.type(screen.getByLabelText('密码'), 'example-password');
  await user.click(screen.getByRole('checkbox', { name: '记住账号' }));

  const submit = screen.getByRole('button', { name: submitButtonName });
  save.mockClear();
  vi.useFakeTimers();
  try {
    fireEvent.click(submit);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(within(submit).getByRole('img', { name: 'loading' })).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(submit);
    fireEvent.click(submit);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000);
    });

    expect(screen.getByText(/登录接口尚未接入/u)).toBeInTheDocument();
    expect(save).toHaveBeenCalledExactlyOnceWith('workbase-login-remembered-username', username);
  } finally {
    vi.useRealTimers();
  }
});

test('浏览器禁止读取和保存账号时，登录演示仍能提交', async () => {
  const unavailable = () => {
    throw new DOMException('Storage is unavailable', 'SecurityError');
  };
  const read = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(unavailable);
  const save = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(unavailable);
  const user = userEvent.setup();
  renderLogin();

  const account = screen.getByRole('textbox', { name: '账号' });
  expect(account).toHaveValue('');
  expect(screen.getByRole('checkbox', { name: '记住账号' })).not.toBeChecked();
  expect(read).toHaveBeenCalledWith('workbase-login-remembered-username');

  await user.type(account, 'demo-user');
  await user.type(screen.getByLabelText('密码'), 'example-password');
  await user.click(screen.getByRole('checkbox', { name: '记住账号' }));
  await user.click(screen.getByRole('button', { name: submitButtonName }));

  expect(await screen.findByText(/登录接口尚未接入/u, {}, { timeout: 3_000 })).toBeInTheDocument();
  expect(save).toHaveBeenCalledWith('workbase-login-remembered-username', 'demo-user');
});

test('演示提交后重新打开表单时只回填记住的账号', async () => {
  const user = userEvent.setup();
  const { unmount } = renderLogin();

  await user.type(screen.getByRole('textbox', { name: '账号' }), 'demo-user');
  await user.type(screen.getByLabelText('密码'), 'example-password');
  await user.click(screen.getByRole('checkbox', { name: '记住账号' }));
  await user.click(screen.getByRole('button', { name: submitButtonName }));

  expect(await screen.findByText(/登录接口尚未接入/u, {}, { timeout: 3_000 })).toBeInTheDocument();
  unmount();
  renderLogin();

  expect(screen.getByRole('textbox', { name: '账号' })).toHaveValue('demo-user');
  expect(screen.getByLabelText('密码')).toHaveValue('');
  expect(screen.getByRole('checkbox', { name: '记住账号' })).toBeChecked();
});

test('取消记住账号并提交后，再打开表单不回填旧账号', async () => {
  const user = userEvent.setup();
  window.localStorage.setItem('workbase-login-remembered-username', 'previous-user');
  const { unmount } = renderLogin();

  expect(screen.getByRole('textbox', { name: '账号' })).toHaveValue('previous-user');
  await user.click(screen.getByRole('checkbox', { name: '记住账号' }));
  await user.type(screen.getByLabelText('密码'), 'example-password');
  await user.click(screen.getByRole('button', { name: submitButtonName }));

  expect(await screen.findByText(/登录接口尚未接入/u, {}, { timeout: 3_000 })).toBeInTheDocument();
  unmount();
  renderLogin();

  expect(screen.getByRole('textbox', { name: '账号' })).toHaveValue('');
  expect(screen.getByRole('checkbox', { name: '记住账号' })).not.toBeChecked();
});

test.each([
  ['忘记密码？', /密码重置功能尚未开放/u],
  ['SSO 单点登录', /SSO 登录尚未接入/u],
])('%s 显示功能尚未接入的提示', async (name, message) => {
  const user = userEvent.setup();
  renderLogin();

  await user.click(screen.getByRole('button', { name }));

  expect(await screen.findByText(message)).toBeInTheDocument();
});
