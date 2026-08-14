# データモデル

## administrators
- id
- email
- display_name
- password_hash
- is_active
- created_at
- updated_at

## admin_sessions
- id
- administrator_id
- token_hash
- expires_at
- created_at
- last_used_at
- revoked_at

## categories
- id
- name
- display_order
- created_at
- updated_at

## manuals
- id
- title
- description
- category_id
- cover_image_object_key
- memo
- created_at
- updated_at
- deleted_at

## manual_steps
- id
- manual_id
- title
- description
- warning
- display_order
- created_at
- updated_at
- deleted_at

## step_images
- id
- manual_step_id
- image_object_key
- image_alt
- width
- height
- mime_type
- display_order
- created_at
- updated_at

制約：1手順最大2件。`display_order`は1または2。

## image_annotations
- id
- step_image_id
- annotation_type
- x
- y
- width
- height
- rotation
- text
- style_data
- display_order
- created_at
- updated_at

annotation_type候補：
- rectangle
- circle
- arrow
- text

## 推奨インデックス
```sql
CREATE INDEX idx_manual_steps_manual
ON manual_steps(manual_id, display_order);

CREATE INDEX idx_step_images_step
ON step_images(manual_step_id, display_order);

CREATE INDEX idx_annotations_image
ON image_annotations(step_image_id, display_order);
```
