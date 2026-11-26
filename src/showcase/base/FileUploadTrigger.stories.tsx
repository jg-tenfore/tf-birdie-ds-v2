import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, styled } from '@mui/material';
import CloudUpload from '@mui/icons-material/CloudUpload';

const HiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

const meta = {
  title: 'Design System/Components/Forms/File Upload Trigger',
  id: 'components-forms-file-upload-trigger',
  parameters: { layout: 'centered' },
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;

export const FileUploadTrigger: Story = {
  render: () => (
    <Button component="label" variant="outlined" startIcon={<CloudUpload />}>
      Upload file
      <HiddenInput type="file" />
    </Button>
  ),
};
