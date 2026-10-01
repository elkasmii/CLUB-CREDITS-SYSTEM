import { useEffect, useState, type FormEvent } from 'react';
import { ImagePlus, Package, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/Card';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { FormError, TextArea, TextInput, Toggle } from '../../components/ui/Form';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/States';
import { useAsync } from '../../hooks/useAsync';
import { useToast } from '../../hooks/useToast';
import { adminService } from '../../services/admin.service';
import { assetUrl, getErrorMessage, getFieldErrors } from '../../services/api';
import type { StoreItem } from '../../types';
import { formatCredits } from '../../utils/format';

interface ItemForm {
  name: string;
  description: string;
  priceInCredits: string;
  stock: string;
  isActive: boolean;
  image: File | null;
  removeImage: boolean;
}

const emptyForm: ItemForm = { name: '', description: '', priceInCredits: '', stock: '', isActive: true, image: null, removeImage: false };
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export function AdminStorePage() {
  const toast = useToast();
  const { data: items, loading, error, reload } = useAsync(() => adminService.storeItems(), []);

  const [editing, setEditing] = useState<StoreItem | 'new' | null>(null);
  const [form, setForm] = useState<ItemForm>(emptyForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<StoreItem | null>(null);

  // Local preview for a newly picked image.
  useEffect(() => {
    if (!form.image) return;
    const url = URL.createObjectURL(form.image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [form.image]);

  function openForm(item: StoreItem | 'new') {
    setEditing(item);
    setErrors({});
    setFormError(null);
    if (item === 'new') {
      setForm(emptyForm);
      setPreview(null);
    } else {
      setForm({
        name: item.name,
        description: item.description ?? '',
        priceInCredits: String(item.priceInCredits),
        stock: String(item.stock),
        isActive: item.isActive,
        image: null,
        removeImage: false,
      });
      setPreview(assetUrl(item.imageUrl));
    }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (form.image && form.image.size > MAX_IMAGE_BYTES) {
      setErrors({ image: 'Image must be 2 MB or smaller.' });
      return;
    }
    const data = new FormData();
    data.set('name', form.name);
    data.set('description', form.description);
    data.set('priceInCredits', form.priceInCredits);
    data.set('stock', form.stock);
    data.set('isActive', String(form.isActive));
    if (form.image) data.set('image', form.image);
    if (form.removeImage && !form.image) data.set('removeImage', 'true');

    setSaving(true);
    setErrors({});
    setFormError(null);
    try {
      if (editing === 'new') {
        await adminService.createStoreItem(data);
        toast.success('Item added to the store.');
      } else if (editing) {
        await adminService.updateStoreItem(editing.id, data);
        toast.success('Item updated.');
      }
      setEditing(null);
      void reload();
    } catch (err) {
      setErrors(getFieldErrors(err));
      setFormError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setSaving(true);
    try {
      const result = await adminService.deleteStoreItem(toDelete.id);
      toast.success(
        result.deleted ? 'Item deleted.' : 'Item has reservation history, so it was deactivated instead of deleted.',
      );
      setToDelete(null);
      void reload();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Store"
        subtitle="Items members can reserve with their CSC Credits."
        actions={
          <Button icon={<Plus size={16} />} onClick={() => openForm('new')}>
            Add item
          </Button>
        }
      />

      {loading && !items ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={reload} />
      ) : items?.length === 0 ? (
        <EmptyState title="The store is empty" icon={<Package size={28} />}>
          Add your first item — stickers, cups, t-shirts…
        </EmptyState>
      ) : (
        <div className="item-grid">
          {items?.map((item) => (
            <article key={item.id} className={`item-card ${item.isActive ? '' : 'is-inactive'}`}>
              <div className="item-card__image">
                {item.imageUrl ? <img src={assetUrl(item.imageUrl)!} alt="" loading="lazy" /> : <Package size={36} aria-hidden />}
              </div>
              <div className="item-card__body">
                <div className="item-card__top">
                  <h3 className="item-card__name">{item.name}</h3>
                  {item.isActive ? <Badge tone="success">Active</Badge> : <Badge>Inactive</Badge>}
                </div>
                {item.description && <p className="item-card__desc">{item.description}</p>}
                <div className="item-card__facts">
                  <span>
                    <strong>{formatCredits(item.priceInCredits)}</strong> credits
                  </span>
                  <span className={item.stock === 0 ? 'text-danger' : ''}>{item.stock} in stock</span>
                  <span className="muted">{item._count?.reservations ?? 0} reservations</span>
                </div>
              </div>
              <div className="item-card__actions">
                <Button size="sm" variant="secondary" icon={<Pencil size={14} />} onClick={() => openForm(item)}>
                  Edit
                </Button>
                <Button size="sm" variant="ghost" icon={<Trash2 size={14} />} onClick={() => setToDelete(item)}>
                  Delete
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        title={editing === 'new' ? 'Add store item' : 'Edit store item'}
        onClose={() => setEditing(null)}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" form="item-form" loading={saving}>
              {editing === 'new' ? 'Add item' : 'Save changes'}
            </Button>
          </>
        }
      >
        <FormError message={formError} />
        <form id="item-form" onSubmit={save} className="item-form">
          <div className="stack">
            <TextInput
              label="Name"
              required
              maxLength={120}
              placeholder="CSC Hoodie"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              error={errors.name}
            />
            <TextArea
              label="Description"
              rows={3}
              maxLength={2000}
              placeholder="Official CSC Hoodie"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              error={errors.description}
            />
            <div className="form-grid">
              <TextInput
                label="Price (CSC Credits)"
                type="number"
                min={1}
                step={1}
                required
                inputMode="numeric"
                value={form.priceInCredits}
                onChange={(e) => setForm({ ...form, priceInCredits: e.target.value })}
                error={errors.priceInCredits}
              />
              <TextInput
                label="Stock"
                type="number"
                min={0}
                step={1}
                required
                inputMode="numeric"
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                error={errors.stock}
              />
            </div>
            <Toggle label="Visible in store" checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
          </div>

          <div className="image-picker">
            <span className="field__label">Image</span>
            <label className="image-picker__drop">
              {preview && !form.removeImage ? <img src={preview} alt="Preview" /> : <ImagePlus size={32} aria-hidden />}
              <span>{preview && !form.removeImage ? 'Change image' : 'Upload image'}</span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="visually-hidden"
                onChange={(e) => setForm({ ...form, image: e.target.files?.[0] ?? null, removeImage: false })}
              />
            </label>
            <p className="field__hint">JPG, PNG, WEBP or GIF · max 2 MB</p>
            {errors.image && <p className="field__error">{errors.image}</p>}
            {preview && !form.removeImage && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setForm({ ...form, image: null, removeImage: true });
                  setPreview(null);
                }}
              >
                Remove image
              </Button>
            )}
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete item?"
        message={
          <>
            <strong>{toDelete?.name}</strong> will be removed from the store. If members have reserved it before, it will
            be deactivated instead so their history is kept.
          </>
        }
        confirmLabel="Delete"
        tone="danger"
        loading={saving}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
