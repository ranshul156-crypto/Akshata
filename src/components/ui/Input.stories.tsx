import type { Meta, StoryObj } from '@storybook/react';

import { InputField } from '@/components/ui/Input';

const meta: Meta<typeof InputField> = {
  title: 'UI/InputField',
  component: InputField,
  tags: ['autodocs'],
  args: {
    label: 'Email',
    inputId: 'email',
    placeholder: 'you@example.com',
  },
};

export default meta;

type Story = StoryObj<typeof InputField>;

export const Default: Story = {};

export const WithHint: Story = {
  args: {
    hint: 'We will never share your email.',
  },
};

export const WithError: Story = {
  args: {
    error: 'Please enter a valid email',
  },
};
