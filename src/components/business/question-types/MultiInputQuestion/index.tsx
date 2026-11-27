import { Input } from 'antd';

import { ItemList } from '../ItemList';
import { createDefaultBlanks } from '../option-model';
import type { QuestionTypeComponentProps } from '../types';

import './index.less';

/** 多项填空：多个带标题的填空项。 */
export const MultiInputQuestion = ({ blanks }: QuestionTypeComponentProps) => (
  <div className="multi-input-question">
    <ItemList items={blanks?.length ? blanks : createDefaultBlanks()}>
      {(item) => <Input disabled placeholder="请输入内容" aria-label={item.title} />}
    </ItemList>
  </div>
);
