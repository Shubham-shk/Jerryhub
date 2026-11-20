import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  Images,
  Layers,
  Loader2,
  Package as PackageIcon,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { AdminCmsShell } from "../../components/admin/AdminCmsShell";
import { AlbumEditor } from "../../components/admin/AlbumEditor";
import { useUI } from "../../context/UIContext";
import { DEMO_MODE } from "../../lib/config";
import {
  createContentPack,
  createContentSet,
  deleteContentPack,
  deleteContentSet,
  fetchContentPack,
  fetchContentPacks,
  fetchContentSet,
  fetchContentSets,
  fetchSetImageCounts,
  nextDefaultName,
  renameContentSet,
  updateContentPack,
  type ContentPack,
  type ContentSet,
} from "../../lib/contentCms";

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

/* ========================================================================== */
/* Sets list                                                                  */
/* ========================================================================== */

export function AdminSetsPage() {
  const { toast } = useUI();
  const [sets, setSets] = useState<ContentSet[]>([]);
  const [packs, setPacks] = useState<ContentPack[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (DEMO_MODE) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [nextSets, nextPacks, nextCounts] = await Promise.all([
        fetchContentSets(),
        fetchContentPacks(),
        fetchSetImageCounts(),
      ]);
      setSets(nextSets);
      setPacks(nextPacks);
      setCounts(nextCounts);
    } catch (nextError) {
      setError(errorMessage(nextError, "Could not load sets."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    try {
      const created = await createContentSet(newName);
      setNewName("");
      toast(`${created.name} created.`, "success");
      await load();
    } catch (nextError) {
      toast(errorMessage(nextError, "Could not create the set."), "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleRename(set: ContentSet) {
    const name = editingName.trim();
    if (!name) {
      toast("Set name cannot be empty.", "error");
      return;
    }
    setBusy(set.id);
    try {
      await renameContentSet(set.id, name);
      setEditingId(null);
      toast("Set renamed.", "success");
      await load();
    } catch (nextError) {
      toast(errorMessage(nextError, "Could not rename the set."), "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(set: ContentSet) {
    if (
      !window.confirm(
        `Delete “${set.name}”? Its album images are removed and any packs using it become unassigned.`,
      )
    ) {
      return;
    }
    setBusy(set.id);
    try {
      await deleteContentSet(set.id);
      toast(`${set.name} deleted.`, "success");
      await load();
    } catch (nextError) {
      toast(errorMessage(nextError, "Could not delete the set."), "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminCmsShell
      title="Sets"
      description="Reusable image albums. Assign the same set to multiple packs to share one album."
      actions={
        <Link to="/admin/packs" className="btn btn--ghost btn--sm">
          <PackageIcon size={14} /> Manage packs
        </Link>
      }
    >
      <form className="admin-cms-create" onSubmit={handleCreate}>
        <label className="field">
          <span>New set name (optional)</span>
          <input
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder={nextDefaultName("Set", sets.map((set) => set.name))}
            disabled={creating}
          />
        </label>
        <button type="submit" className="btn btn--primary" disabled={creating}>
          {creating ? <Loader2 size={15} className="spin" /> : <Plus size={15} />}
          Create set
        </button>
      </form>

      {loading ? (
        <div className="admin-loading"><Loader2 size={24} className="spin" /> Loading sets…</div>
      ) : error ? (
        <div className="admin-error">{error}</div>
      ) : sets.length ? (
        <div className="admin-cms-grid">
          {sets.map((set) => {
            const packCount = packs.filter((pack) => pack.set_id === set.id).length;
            const imageCount = counts[set.id] ?? 0;
            const isEditing = editingId === set.id;
            return (
              <article className="admin-cms-card" key={set.id}>
                <div className="admin-cms-card-head">
                  {isEditing ? (
                    <form
                      className="admin-cms-rename"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void handleRename(set);
                      }}
                    >
                      <input
                        autoFocus
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        disabled={busy === set.id}
                        aria-label="Set name"
                      />
                      <button
                        type="submit"
                        className="icon-btn"
                        disabled={busy === set.id}
                        aria-label="Save set name"
                      >
                        <Save size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setEditingId(null)}
                        disabled={busy === set.id}
                        aria-label="Cancel rename"
                      >
                        <X size={14} />
                      </button>
                    </form>
                  ) : (
                    <h2>{set.name}</h2>
                  )}
                  <span className="admin-cms-badge">
                    <Images size={13} /> {imageCount}
                  </span>
                </div>

                <p className="admin-cms-meta">
                  {packCount} pack{packCount === 1 ? "" : "s"} sharing this album
                </p>

                <div className="admin-cms-card-actions">
                  <Link to={`/admin/sets/${set.id}`} className="btn btn--primary btn--sm">
                    <Images size={14} /> Open album
                  </Link>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                      setEditingId(set.id);
                      setEditingName(set.name);
                    }}
                    disabled={busy === set.id}
                  >
                    <Pencil size={13} /> Rename
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm admin-cms-danger"
                    onClick={() => void handleDelete(set)}
                    disabled={busy === set.id}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="admin-cms-empty">
          <span className="admin-cms-empty-icon"><Layers size={24} /></span>
          <h2>No sets yet</h2>
          <p>Create your first set above. It will be named Set 1 automatically.</p>
        </div>
      )}
    </AdminCmsShell>
  );
}

/* ========================================================================== */
/* Set detail                                                                 */
/* ========================================================================== */

export function AdminSetPage() {
  const { setId } = useParams<{ setId: string }>();
  const { toast } = useUI();
  const [set, setSet] = useState<ContentSet | null>(null);
  const [packs, setPacks] = useState<ContentPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);

  const load = useCallback(async () => {
    if (!setId) {
      setError("Set not found.");
      setLoading(false);
      return;
    }
    if (DEMO_MODE) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [nextSet, nextPacks] = await Promise.all([
        fetchContentSet(setId),
        fetchContentPacks(),
      ]);
      if (!nextSet) {
        setError("This set no longer exists.");
        setSet(null);
        return;
      }
      setSet(nextSet);
      setNameDraft(nextSet.name);
      setPacks(nextPacks.filter((pack) => pack.set_id === setId));
    } catch (nextError) {
      setError(errorMessage(nextError, "Could not load this set."));
    } finally {
      setLoading(false);
    }
  }, [setId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRename(event: React.FormEvent) {
    event.preventDefault();
    if (!set) return;
    setSavingName(true);
    try {
      const updated = await renameContentSet(set.id, nameDraft);
      setSet(updated);
      setNameDraft(updated.name);
      toast("Set renamed.", "success");
    } catch (nextError) {
      toast(errorMessage(nextError, "Could not rename the set."), "error");
    } finally {
      setSavingName(false);
    }
  }

  if (loading) {
    return (
      <AdminCmsShell title="Set" backTo="/admin/sets" backLabel="All sets">
        <div className="admin-loading"><Loader2 size={24} className="spin" /> Loading set…</div>
      </AdminCmsShell>
    );
  }

  if (error || !set) {
    return (
      <AdminCmsShell title="Set unavailable" backTo="/admin/sets" backLabel="All sets">
        <div className="admin-cms-empty">
          <h2>{error ?? "Set not found"}</h2>
          <Link to="/admin/sets" className="btn btn--primary btn--sm">Back to sets</Link>
        </div>
      </AdminCmsShell>
    );
  }

  return (
    <AdminCmsShell
      title={set.name}
      description="Manage this reusable album. Every pack assigned to it shares these images."
      backTo="/admin/sets"
      backLabel="All sets"
      actions={
        <Link to="/admin/packs" className="btn btn--ghost btn--sm">
          <PackageIcon size={14} /> Manage packs
        </Link>
      }
    >
      <div className="admin-cms-panel">
        <form className="admin-cms-inline-form" onSubmit={handleRename}>
          <label className="field">
            <span>Set name</span>
            <input
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              disabled={savingName}
            />
          </label>
          <button type="submit" className="btn btn--primary btn--sm" disabled={savingName}>
            {savingName ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            Save name
          </button>
        </form>

        <div className="admin-cms-shared">
          <h2>Packs using this set</h2>
          {packs.length ? (
            <div className="admin-cms-chiplist">
              {packs.map((pack) => (
                <Link key={pack.id} to={`/admin/packs/${pack.id}`} className="admin-cms-chip">
                  {pack.name} <ArrowRight size={13} />
                </Link>
              ))}
            </div>
          ) : (
            <p>No packs assigned yet. Create a pack and assign it to this set.</p>
          )}
        </div>
      </div>

      <div className="admin-cms-panel">
        <AlbumEditor
          setId={set.id}
          setName={set.name}
          note="Images belong to this set. Every pack assigned to it shows the same album."
          onAlbumChanged={() => void load()}
        />
      </div>
    </AdminCmsShell>
  );
}

/* ========================================================================== */
/* Packs list                                                                 */
/* ========================================================================== */

export function AdminPacksPage() {
  const { toast } = useUI();
  const [packs, setPacks] = useState<ContentPack[]>([]);
  const [sets, setSets] = useState<ContentSet[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newSetId, setNewSetId] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (DEMO_MODE) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [nextPacks, nextSets, nextCounts] = await Promise.all([
        fetchContentPacks(),
        fetchContentSets(),
        fetchSetImageCounts(),
      ]);
      setPacks(nextPacks);
      setSets(nextSets);
      setCounts(nextCounts);
    } catch (nextError) {
      setError(errorMessage(nextError, "Could not load packs."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function handleNameChange(value: string) {
    setNewName(value);
    const match = packs.find(
      (pack) => pack.name.trim().toLowerCase() === value.trim().toLowerCase(),
    );
    if (match && !newSetId) setNewSetId(match.set_id ?? "");
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    try {
      const created = await createContentPack({
        name: newName,
        setId: newSetId || null,
      });
      setNewName("");
      setNewSetId("");
      toast(`${created.name} created.`, "success");
      await load();
    } catch (nextError) {
      toast(errorMessage(nextError, "Could not create the pack."), "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleRename(pack: ContentPack) {
    const name = editingName.trim();
    if (!name) {
      toast("Pack name cannot be empty.", "error");
      return;
    }
    setBusy(pack.id);
    try {
      await updateContentPack(pack.id, { name });
      setEditingId(null);
      toast("Pack renamed.", "success");
      await load();
    } catch (nextError) {
      toast(errorMessage(nextError, "Could not rename the pack."), "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleAssign(pack: ContentPack, setId: string) {
    setBusy(pack.id);
    try {
      await updateContentPack(pack.id, { setId: setId || null });
      toast("Pack set updated.", "success");
      await load();
    } catch (nextError) {
      toast(errorMessage(nextError, "Could not update the pack."), "error");
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete(pack: ContentPack) {
    if (!window.confirm(`Delete “${pack.name}”? The shared set album is not affected.`)) {
      return;
    }
    setBusy(pack.id);
    try {
      await deleteContentPack(pack.id);
      toast(`${pack.name} deleted.`, "success");
      await load();
    } catch (nextError) {
      toast(errorMessage(nextError, "Could not delete the pack."), "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AdminCmsShell
      title="Packs"
      description="Independently managed content packs. Assign a set to share its album with other packs."
      actions={
        <Link to="/admin/sets" className="btn btn--ghost btn--sm">
          <Layers size={14} /> Manage sets
        </Link>
      }
    >
      <form className="admin-cms-create admin-cms-create--pack" onSubmit={handleCreate}>
        <label className="field">
          <span>New pack name (optional)</span>
          <input
            value={newName}
            onChange={(event) => handleNameChange(event.target.value)}
            placeholder={nextDefaultName("Pack", packs.map((pack) => pack.name))}
            disabled={creating}
          />
        </label>
        <label className="field">
          <span>Assign a set</span>
          <select
            value={newSetId}
            onChange={(event) => setNewSetId(event.target.value)}
            disabled={creating}
          >
            <option value="">No set assigned</option>
            {sets.map((set) => (
              <option key={set.id} value={set.id}>{set.name}</option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn btn--primary" disabled={creating}>
          {creating ? <Loader2 size={15} className="spin" /> : <Plus size={15} />}
          Create pack
        </button>
      </form>

      {loading ? (
        <div className="admin-loading"><Loader2 size={24} className="spin" /> Loading packs…</div>
      ) : error ? (
        <div className="admin-error">{error}</div>
      ) : packs.length ? (
        <div className="admin-cms-grid">
          {packs.map((pack) => {
            const assignedSet = sets.find((set) => set.id === pack.set_id);
            const imageCount = pack.set_id ? counts[pack.set_id] ?? 0 : 0;
            const isEditing = editingId === pack.id;
            return (
              <article className="admin-cms-card" key={pack.id}>
                <div className="admin-cms-card-head">
                  {isEditing ? (
                    <form
                      className="admin-cms-rename"
                      onSubmit={(event) => {
                        event.preventDefault();
                        void handleRename(pack);
                      }}
                    >
                      <input
                        autoFocus
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        disabled={busy === pack.id}
                        aria-label="Pack name"
                      />
                      <button
                        type="submit"
                        className="icon-btn"
                        disabled={busy === pack.id}
                        aria-label="Save pack name"
                      >
                        <Save size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-btn"
                        onClick={() => setEditingId(null)}
                        disabled={busy === pack.id}
                        aria-label="Cancel rename"
                      >
                        <X size={14} />
                      </button>
                    </form>
                  ) : (
                    <h2>{pack.name}</h2>
                  )}
                  <span className="admin-cms-badge">
                    <Images size={13} /> {imageCount}
                  </span>
                </div>

                <label className="admin-cms-assign">
                  <span>Assigned set</span>
                  <select
                    value={pack.set_id ?? ""}
                    onChange={(event) => void handleAssign(pack, event.target.value)}
                    disabled={busy === pack.id}
                  >
                    <option value="">No set assigned</option>
                    {sets.map((set) => (
                      <option key={set.id} value={set.id}>{set.name}</option>
                    ))}
                  </select>
                </label>

                <p className="admin-cms-meta">
                  {assignedSet
                    ? `Shares the ${assignedSet.name} album`
                    : "Not linked to an album yet"}
                </p>

                <div className="admin-cms-card-actions">
                  <Link to={`/admin/packs/${pack.id}`} className="btn btn--primary btn--sm">
                    <PackageIcon size={14} /> Open pack
                  </Link>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm"
                    onClick={() => {
                      setEditingId(pack.id);
                      setEditingName(pack.name);
                    }}
                    disabled={busy === pack.id}
                  >
                    <Pencil size={13} /> Rename
                  </button>
                  <button
                    type="button"
                    className="btn btn--ghost btn--sm admin-cms-danger"
                    onClick={() => void handleDelete(pack)}
                    disabled={busy === pack.id}
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="admin-cms-empty">
          <span className="admin-cms-empty-icon"><PackageIcon size={24} /></span>
          <h2>No packs yet</h2>
          <p>Create your first pack above. It will be named Pack 1 automatically.</p>
        </div>
      )}
    </AdminCmsShell>
  );
}

/* ========================================================================== */
/* Pack detail                                                                */
/* ========================================================================== */

export function AdminPackPage() {
  const { packId } = useParams<{ packId: string }>();
  const { toast } = useUI();
  const [pack, setPack] = useState<ContentPack | null>(null);
  const [sets, setSets] = useState<ContentSet[]>([]);
  const [siblings, setSiblings] = useState<ContentPack[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [creatingSet, setCreatingSet] = useState(false);

  const load = useCallback(async () => {
    if (!packId) {
      setError("Pack not found.");
      setLoading(false);
      return;
    }
    if (DEMO_MODE) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [nextPack, nextSets, nextPacks] = await Promise.all([
        fetchContentPack(packId),
        fetchContentSets(),
        fetchContentPacks(),
      ]);
      if (!nextPack) {
        setError("This pack no longer exists.");
        setPack(null);
        return;
      }
      setPack(nextPack);
      setNameDraft(nextPack.name);
      setSets(nextSets);
      setSiblings(
        nextPack.set_id
          ? nextPacks.filter(
              (item) => item.id !== nextPack.id && item.set_id === nextPack.set_id,
            )
          : [],
      );
    } catch (nextError) {
      setError(errorMessage(nextError, "Could not load this pack."));
    } finally {
      setLoading(false);
    }
  }, [packId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleRename(event: React.FormEvent) {
    event.preventDefault();
    if (!pack) return;
    setSavingName(true);
    try {
      const updated = await updateContentPack(pack.id, { name: nameDraft });
      setPack(updated);
      setNameDraft(updated.name);
      toast("Pack renamed.", "success");
    } catch (nextError) {
      toast(errorMessage(nextError, "Could not rename the pack."), "error");
    } finally {
      setSavingName(false);
    }
  }

  async function handleAssign(setId: string) {
    if (!pack) return;
    setAssigning(true);
    try {
      await updateContentPack(pack.id, { setId: setId || null });
      toast("Pack set updated.", "success");
      await load();
    } catch (nextError) {
      toast(errorMessage(nextError, "Could not update the pack."), "error");
    } finally {
      setAssigning(false);
    }
  }

  async function handleCreateSet() {
    if (!pack) return;
    setCreatingSet(true);
    try {
      const created = await createContentSet();
      await updateContentPack(pack.id, { setId: created.id });
      toast(`${created.name} created and assigned.`, "success");
      await load();
    } catch (nextError) {
      toast(errorMessage(nextError, "Could not create a set."), "error");
    } finally {
      setCreatingSet(false);
    }
  }

  if (loading) {
    return (
      <AdminCmsShell title="Pack" backTo="/admin/packs" backLabel="All packs">
        <div className="admin-loading"><Loader2 size={24} className="spin" /> Loading pack…</div>
      </AdminCmsShell>
    );
  }

  if (error || !pack) {
    return (
      <AdminCmsShell title="Pack unavailable" backTo="/admin/packs" backLabel="All packs">
        <div className="admin-cms-empty">
          <h2>{error ?? "Pack not found"}</h2>
          <Link to="/admin/packs" className="btn btn--primary btn--sm">Back to packs</Link>
        </div>
      </AdminCmsShell>
    );
  }

  const assignedSet = sets.find((set) => set.id === pack.set_id) ?? null;

  return (
    <AdminCmsShell
      title={pack.name}
      description={
        assignedSet
          ? `This pack shares the ${assignedSet.name} album with ${siblings.length} other pack${siblings.length === 1 ? "" : "s"}.`
          : "This pack has no set yet. Assign one to start building its album."
      }
      backTo="/admin/packs"
      backLabel="All packs"
      actions={
        assignedSet ? (
          <Link to={`/admin/sets/${assignedSet.id}`} className="btn btn--ghost btn--sm">
            <Layers size={14} /> Open {assignedSet.name}
          </Link>
        ) : undefined
      }
    >
      <div className="admin-cms-panel">
        <form className="admin-cms-inline-form" onSubmit={handleRename}>
          <label className="field">
            <span>Pack name</span>
            <input
              value={nameDraft}
              onChange={(event) => setNameDraft(event.target.value)}
              disabled={savingName}
            />
          </label>
          <button type="submit" className="btn btn--primary btn--sm" disabled={savingName}>
            {savingName ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
            Save name
          </button>
        </form>

        <div className="admin-cms-inline-form">
          <label className="field">
            <span>Assigned set</span>
            <select
              value={pack.set_id ?? ""}
              onChange={(event) => void handleAssign(event.target.value)}
              disabled={assigning}
            >
              <option value="">No set assigned</option>
              {sets.map((set) => (
                <option key={set.id} value={set.id}>{set.name}</option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => void handleCreateSet()}
            disabled={creatingSet}
          >
            {creatingSet ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
            Create new set
          </button>
        </div>

        {siblings.length > 0 && (
          <div className="admin-cms-shared">
            <h2>Packs sharing this album</h2>
            <div className="admin-cms-chiplist">
              {siblings.map((sibling) => (
                <Link
                  key={sibling.id}
                  to={`/admin/packs/${sibling.id}`}
                  className="admin-cms-chip"
                >
                  {sibling.name} <ArrowRight size={13} />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="admin-cms-panel">
        <AlbumEditor
          setId={pack.set_id}
          setName={assignedSet?.name}
          note={
            assignedSet
              ? `These images are stored on ${assignedSet.name}. Every pack assigned to it edits the same album.`
              : undefined
          }
          emptyAction={
            <div className="album-empty-copy">
              <p>Assign a set above to manage this pack&apos;s shared album.</p>
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => void handleCreateSet()}
                disabled={creatingSet}
              >
                {creatingSet ? <Loader2 size={14} className="spin" /> : <Plus size={14} />}
                Create Set {nextDefaultName("Set", sets.map((set) => set.name)).split(" ")[1]}
              </button>
            </div>
          }
          onAlbumChanged={() => void load()}
        />
      </div>
    </AdminCmsShell>
  );
}
