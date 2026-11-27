import { DeleteOutlined, PictureOutlined, PlusOutlined } from '@ant-design/icons';
import { Button, Checkbox, Image, Radio, Tooltip } from 'antd';

import type { ImageOptionItem, QuestionOptionItem } from '../types';

import './index.less';

interface AddOptionButtonProps {
  onAdd: () => void;
  /** 无障碍名称，默认「添加选项」。 */
  label?: string;
}

/** 选项末尾的添加入口。 */
export const AddOptionButton = ({ onAdd, label = '添加选项' }: AddOptionButtonProps) => (
  <Button
    className="question-type__add-option"
    type="dashed"
    icon={<PlusOutlined />}
    aria-label={label}
    onClick={onAdd}
  >
    {label}
  </Button>
);

interface OptionRemoveButtonProps {
  index: number;
  label: string;
  disabled: boolean;
  onRemove: (index: number) => void;
}

/** 单个选项的删除入口：至少保留一项时禁用。 */
const OptionRemoveButton = ({ index, label, disabled, onRemove }: OptionRemoveButtonProps) => (
  <Tooltip title={disabled ? '至少保留一个选项' : '删除选项'}>
    <Button
      className="question-type__option-remove"
      type="text"
      size="small"
      icon={<DeleteOutlined />}
      disabled={disabled}
      aria-label={`删除${label}`}
      onClick={() => onRemove(index)}
    />
  </Tooltip>
);

interface OptionListProps {
  options: QuestionOptionItem[];
  multiple: boolean;
  onAddOption?: (() => void) | undefined;
  onRemoveOption?: ((index: number) => void) | undefined;
}

/** 选择题选项列表：控件为禁用态预览。 */
export const OptionList = ({ options, multiple, onAddOption, onRemoveOption }: OptionListProps) => {
  const Control = multiple ? Checkbox : Radio;

  return (
    <div className="question-type__options">
      <ul className="question-type__option-list">
        {options.map((option, index) => (
          <li className="question-type__option" key={option.id}>
            <Control disabled className="question-type__option-control">
              {option.label}
            </Control>
            {onRemoveOption ? (
              <OptionRemoveButton
                index={index}
                label={option.label}
                disabled={options.length <= 1}
                onRemove={onRemoveOption}
              />
            ) : null}
          </li>
        ))}
      </ul>
      {onAddOption ? <AddOptionButton onAdd={onAddOption} /> : null}
    </div>
  );
};

interface ImageOptionListProps extends Omit<OptionListProps, 'options'> {
  options: ImageOptionItem[];
}

/** 图片选择题选项列表：图片卡片 + 选择控件。 */
export const ImageOptionList = ({
  options,
  multiple,
  onAddOption,
  onRemoveOption,
}: ImageOptionListProps) => {
  const Control = multiple ? Checkbox : Radio;

  return (
    <div className="question-type__options">
      <ul className="question-type__image-list">
        {options.map((option, index) => (
          <li className="question-type__image-option" key={option.id}>
            <div className="question-type__image-media">
              {option.url ? (
                <Image
                  className="question-type__image-thumb"
                  src={option.url}
                  alt={option.label}
                  width="100%"
                  height="100%"
                  preview={false}
                />
              ) : (
                <span className="question-type__image-placeholder">
                  <PictureOutlined aria-hidden="true" />
                  暂无图片
                </span>
              )}
            </div>
            <div className="question-type__image-caption">
              <Control disabled className="question-type__option-control">
                {option.label}
              </Control>
              {onRemoveOption ? (
                <OptionRemoveButton
                  index={index}
                  label={option.label}
                  disabled={options.length <= 1}
                  onRemove={onRemoveOption}
                />
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {onAddOption ? <AddOptionButton onAdd={onAddOption} /> : null}
    </div>
  );
};
