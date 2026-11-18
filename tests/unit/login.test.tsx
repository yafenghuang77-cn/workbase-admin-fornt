import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test } from 'vitest';

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
