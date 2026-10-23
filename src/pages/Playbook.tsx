import { useRef, useState } from "react";
import { useStore } from "../store";
import type { PlaybookEntry, ScreenshotExample, ScreenshotGroup } from "../types";
import { PlaybookModal } from "../components/modals/PlaybookModal";
import { Lightbox } from "../components/ui/Lightbox";
import { compressImage } from "../db";

interface Props {
  onConfirm: (msg: string, label?: string) => Promise<boolean>;
  onToast: (msg: string, type?: "success" | "error" | "info") => void;
}

export function Playbook({ onConfirm, onToast }: Props) {
  const {
    playbook, screenshotGroups, savePlaybook, deletePlaybook,
    saveScreenshotGroup, deleteScreenshotGroup,
  } = useStore();
  const [activeTab, setActiveTab] = useState<"setups" | "screenshots">("setups");
  const screenshotInputRef = useRef<HTMLInputElement>(null);
  const uploadTargetRef = useRef<{
    group: ScreenshotGroup;
    exampleId: string;
    slot: "before" | "after";
  } | null>(null);
  const [groupEditor, setGroupEditor] = useState<ScreenshotGroup | null>(null);
  const [groupName, setGroupName] = useState("");
  const screenshotCount = screenshotGroups.reduce(
    (total, group) => total + group.examples.reduce(
      (count, example) => count + Number(!!example.before) + Number(!!example.after) + Number(!!example.image),
      0,
    ),
    0,
  );
  const [modalEntry, setModalEntry] = useState<
    PlaybookEntry | null | undefined
  >(undefined);
  const [detailEntry, setDetailEntry] = useState<PlaybookEntry | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const handleSave = async (entry: PlaybookEntry) => {
    await savePlaybook(entry);
    onToast(entry.id ? "Setup updated ✓" : "Setup added ✓", "success");
  };

  const handleDelete = async (entry: PlaybookEntry) => {
    const ok = await onConfirm("Delete this playbook entry?");
    if (!ok) return;
    await deletePlaybook(entry.id!);
    setDetailEntry(null);
    onToast("Entry deleted", "info");
  };

  const openGroupEditor = (group?: ScreenshotGroup) => {
    setGroupEditor(group ? { ...group } : { name: "", examples: [] });
    setGroupName(group?.name ?? "");
  };

  const saveGroupName = async () => {
    const name = groupName.trim();
    if (!name || !groupEditor) return;
    await saveScreenshotGroup({ ...groupEditor, name });
    onToast(groupEditor.id ? "Screenshot setup renamed" : "Screenshot setup added", "success");
    setGroupEditor(null);
  };

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.currentTarget;
    const target = uploadTargetRef.current;
    const file = input.files?.[0];
    if (!target || !file) return;
    const image = await compressImage(file);
    const examples = target.group.examples.map(example =>
      example.id === target.exampleId ? { ...example, [target.slot]: image } : example,
    );
    await saveScreenshotGroup({ ...target.group, examples });
    onToast(`${target.slot === "before" ? "Before" : "After"} image added to ${target.group.name}`, "success");
    uploadTargetRef.current = null;
    input.value = "";
  };

  const openImageUpload = (group: ScreenshotGroup, exampleId: string, slot: "before" | "after") => {
    uploadTargetRef.current = { group, exampleId, slot };
    screenshotInputRef.current?.click();
  };

  const addScreenshotExample = async (group: ScreenshotGroup) => {
    const example: ScreenshotExample = {
      id: `example-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    };
    await saveScreenshotGroup({ ...group, examples: [...group.examples, example] });
  };

  const removeScreenshotExample = async (group: ScreenshotGroup, exampleId: string, index: number) => {
    const ok = await onConfirm(`Remove Example ${index + 1} and its images?`);
    if (!ok) return;
    await saveScreenshotGroup({
      ...group,
      examples: group.examples.filter(example => example.id !== exampleId),
    });
    onToast("Screenshot example removed", "info");
  };

  const handleRemoveScreenshot = async (
    group: ScreenshotGroup,
    exampleId: string,
    slot: "before" | "after" | "image",
  ) => {
    const examples = group.examples.map(example => {
      if (example.id !== exampleId) return example;
      const updated = { ...example };
      delete updated[slot];
      return updated;
    });
    await saveScreenshotGroup({ ...group, examples });
    onToast("Screenshot removed", "info");
  };

  const handleDeleteScreenshotGroup = async (group: ScreenshotGroup) => {
    const ok = await onConfirm(`Delete the screenshot collection "${group.name}"?`);
    if (!ok) return;
    await deleteScreenshotGroup(group.id!);
    onToast("Screenshot collection deleted", "info");
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="page-title">Playbook</div>
          <div className="page-subtitle">
            Define and document your trading setups
          </div>
        </div>
        {activeTab === "setups" ? (
          <button className="btn btn-primary" onClick={() => setModalEntry(null)}>
            ➕ Add Setup
          </button>
        ) : (
          <button className="btn btn-primary" onClick={() => openGroupEditor()}>
            ➕ Add screenshot setup
          </button>
        )}
      </div>

      <div className="section-tabs">
        <button
          className={"section-tab" + (activeTab === "setups" ? " active" : "")}
          onClick={() => setActiveTab("setups")}
        >
          Setups
        </button>
        <button
          className={"section-tab" + (activeTab === "screenshots" ? " active" : "")}
          onClick={() => setActiveTab("screenshots")}
        >
          Screenshots
          <span style={{ marginLeft: 6, opacity: 0.7 }}>{screenshotCount}</span>
        </button>
      </div>

      {activeTab === "setups" ? (
        playbook.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📖</div>
          <h3>No setups defined</h3>
          <p>Create your first playbook entry to document a trading setup.</p>
        </div>
      ) : (() => {
        // Group by quality grade: A+ → A → ungraded
        const groups: { label: string; entries: typeof playbook }[] = [
          {
            label: 'A+ Setups',
            entries: playbook.filter(e => e.quality === 'A+'),
          },
          {
            label: 'A Setups',
            entries: playbook.filter(e => e.quality === 'A'),
          },
          {
            label: 'Ungraded Setups',
            entries: playbook.filter(e => !e.quality),
          },
        ].filter(g => g.entries.length > 0);

        return (
          <div>
            {groups.map(group => (
              <div key={group.label} style={{ marginBottom: 32 }}>
                {/* Simple section heading */}
                <div style={{
                  display: 'flex', alignItems: 'baseline', gap: 10,
                  marginBottom: 14, paddingBottom: 8,
                  borderBottom: '1px solid var(--border)',
                }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {group.label}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    {group.entries.length} {group.entries.length === 1 ? 'setup' : 'setups'}
                  </span>
                </div>

                <div className="playbook-grid">
                  {group.entries.map((e) => (
            <div
              key={e.id}
              className="playbook-card"
              onClick={() => setDetailEntry(e)}
            >
              <div className="flex-between mb-8">
                <div className="flex gap-8" style={{ alignItems: 'center', minWidth: 0 }}>
                  <div className="playbook-name" style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.name}</div>
                  {e.quality && (
                    <span
                      className={`badge ${e.quality === 'A+' ? 'badge-aplus' : 'badge-a'}`}
                      style={{ fontSize: 11, flexShrink: 0 }}
                    >
                      {e.quality}
                    </span>
                  )}
                </div>
                <div className="flex gap-8" style={{ flexShrink: 0, marginLeft: 8 }}>
                  <button
                    className="btn-icon btn-sm"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      setModalEntry(e);
                    }}
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    className="btn-icon btn-sm"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      handleDelete(e);
                    }}
                    title="Delete"
                  >
                    🗑
                  </button>
                </div>
              </div>
              {e.desc && (
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginBottom: 8,
                    lineHeight: 1.5,
                  }}
                >
                  {e.desc.slice(0, 100)}
                  {e.desc.length > 100 ? "..." : ""}
                </div>
              )}
              <div
                className="flex gap-8"
                style={{ flexWrap: "wrap", marginTop: 6 }}
              >
                {e.timeframes && (
                  <span className="badge badge-a" style={{ fontSize: 10.5 }}>
                    {e.timeframes}
                  </span>
                )}
                {e.rr && (
                  <span className="badge badge-be" style={{ fontSize: 10.5 }}>
                    R:R {e.rr}
                  </span>
                )}
                {e.rules && (
                  <span
                    className="badge badge-aplus"
                    style={{ fontSize: 10.5 }}
                  >
                    {e.rules.split("\n").filter(Boolean).length} rules
                  </span>
                )}
              </div>
            </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        );
      })()
      ) : (
        <div>
          <Lightbox
            src={lightboxSrc}
            images={screenshotGroups.flatMap(group =>
              group.examples.flatMap(example => [example.before, example.after, example.image].filter((img): img is string => !!img)),
            )}
            onClose={() => setLightboxSrc(null)}
            onNavigate={setLightboxSrc}
          />
          <div className="page-subtitle mb-16">Screenshot collections are independent of Playbook setups.</div>
          {screenshotGroups.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📸</div>
              <h3>No screenshot collections yet</h3>
              <p>Create a screenshot setup, then add separate Before and After examples.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {screenshotGroups.map(group => (
                <section key={group.id} className="card">
                  <div className="flex-between mb-12" style={{ gap: 12, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700 }}>{group.name}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3 }}>
                        {group.examples.length} {group.examples.length === 1 ? "example" : "examples"}
                      </div>
                    </div>
                    <div className="flex gap-8">
                      <button className="btn btn-ghost btn-sm" onClick={() => openGroupEditor(group)}>Rename</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => addScreenshotExample(group)}>➕ Add image pair</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteScreenshotGroup(group)}>Delete</button>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12 }}>
                    Each example can include a Before image, an After image, or both.
                  </div>
                  {group.examples.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {group.examples.map((example, index) => (
                        <div key={example.id} className="card" style={{ padding: 14 }}>
                          <div className="flex-between mb-12">
                            <strong style={{ fontSize: 13 }}>
                              Example {index + 1}{example.image ? " · Existing screenshot" : ""}
                            </strong>
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => removeScreenshotExample(group, example.id, index)}
                            >
                              Remove example
                            </button>
                          </div>
                          {example.image ? (
                            <div style={{ position: "relative", maxWidth: 520 }}>
                              <img
                                src={example.image}
                                alt={group.name + " existing screenshot " + (index + 1)}
                                style={{ width: "100%", maxHeight: 300, objectFit: "contain", borderRadius: "var(--radius-sm)", cursor: "pointer" }}
                                onClick={() => setLightboxSrc(example.image!)}
                              />
                              <button
                                className="img-action-btn del"
                                title="Remove screenshot"
                                aria-label={"Remove existing screenshot " + (index + 1)}
                                style={{ position: "absolute", top: 6, right: 6 }}
                                onClick={() => handleRemoveScreenshot(group, example.id, "image")}
                              >
                                ✕
                              </button>
                            </div>
                          ) : (
                            <div style={{
                              display: "grid",
                              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                              gap: 12,
                            }}>
                              {(["before", "after"] as const).map(slot => {
                                const image = example[slot];
                                const label = slot === "before" ? "Before" : "After";
                                return (
                                  <div key={slot}>
                                    <div style={{
                                      fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
                                      textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 7,
                                    }}>
                                      {label}
                                    </div>
                                    {image ? (
                                      <div style={{ position: "relative" }}>
                                        <img
                                          src={image}
                                          alt={label + " — " + group.name + ", example " + (index + 1)}
                                          style={{ width: "100%", height: 190, objectFit: "cover", borderRadius: "var(--radius-sm)", cursor: "pointer" }}
                                          onClick={() => setLightboxSrc(image)}
                                        />
                                        <button
                                          className="img-action-btn del"
                                          title={"Remove " + label.toLowerCase() + " image"}
                                          aria-label={"Remove " + label.toLowerCase() + " image from example " + (index + 1)}
                                          style={{ position: "absolute", top: 6, right: 6 }}
                                          onClick={() => handleRemoveScreenshot(group, example.id, slot)}
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        className="btn btn-ghost"
                                        style={{ width: "100%", height: 190, justifyContent: "center", borderStyle: "dashed" }}
                                        onClick={() => openImageUpload(group, example.id, slot)}
                                      >
                                        ➕ Add {label} image
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      No image pairs yet. Add an example and fill either or both image slots.
                    </div>
                  )}
                </section>
              ))}
            </div>
          )}
          <input
            ref={screenshotInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleScreenshotUpload}
          />
        </div>
      )}
      {groupEditor && (
        <div className="modal-overlay" onClick={() => setGroupEditor(null)}>
          <div className="modal modal-sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title">{groupEditor.id ? "Rename screenshot setup" : "Add screenshot setup"}</div>
              <button className="close-btn" onClick={() => setGroupEditor(null)}>✕</button>
            </div>
            <div className="modal-body">
              <label className="form-label" htmlFor="screenshot-setup-name">Screenshot setup name</label>
              <input
                id="screenshot-setup-name"
                className="form-control"
                autoFocus
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") void saveGroupName(); }}
                placeholder="e.g. London Open Sweep"
              />
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setGroupEditor(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveGroupName} disabled={!groupName.trim()}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {modalEntry !== undefined && (
        <PlaybookModal
          entry={modalEntry}
          onClose={() => setModalEntry(undefined)}
          onSave={handleSave}
        />
      )}

      {/* Detail */}
      {detailEntry && (
        <>
          <div className="modal-overlay" onClick={() => setDetailEntry(null)}>
            <div
              className="modal modal-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {detailEntry.name}
                {detailEntry.quality && (
                  <span className={`badge ${detailEntry.quality === 'A+' ? 'badge-aplus' : 'badge-a'}`} style={{ fontSize: 12 }}>
                    {detailEntry.quality}
                  </span>
                )}
              </div>
                <button
                  className="close-btn"
                  onClick={() => setDetailEntry(null)}
                >
                  ✕
                </button>
              </div>
              <div className="modal-body">
                {detailEntry.desc && (
                  <div
                    style={{
                      marginBottom: 20,
                      color: "var(--text-secondary)",
                      lineHeight: 1.7,
                    }}
                  >
                    {detailEntry.desc}
                  </div>
                )}
                {detailEntry.rules &&
                  detailEntry.rules.split("\n").filter(Boolean).length > 0 && (
                    <div className="form-section">
                      <div className="section-title">✅ Entry Rules</div>
                      {detailEntry.rules
                        .split("\n")
                        .filter(Boolean)
                        .map((r, i) => (
                          <div key={i} className="rule-item">
                            <span
                              style={{
                                color: "var(--accent)",
                                fontWeight: 600,
                                fontSize: 12,
                              }}
                            >
                              {i + 1}
                            </span>
                            <label>{r}</label>
                          </div>
                        ))}
                    </div>
                  )}
                <div className="form-grid" style={{ marginTop: 16 }}>
                  {detailEntry.timeframes && (
                    <div>
                      <div className="detail-label">Timeframes</div>
                      <div className="detail-value" style={{ marginTop: 4 }}>
                        {detailEntry.timeframes}
                      </div>
                    </div>
                  )}
                  {detailEntry.rr && (
                    <div>
                      <div className="detail-label">Typical R:R</div>
                      <div className="detail-value" style={{ marginTop: 4 }}>
                        {detailEntry.rr}
                      </div>
                    </div>
                  )}
                </div>
                {detailEntry.notes && (
                  <div className="form-section" style={{ marginTop: 16 }}>
                    <div className="section-title">💡 Edge</div>
                    <div
                      style={{
                        color: "var(--text-secondary)",
                        lineHeight: 1.7,
                      }}
                    >
                      {detailEntry.notes}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  className="btn btn-danger btn-sm"
                  onClick={() => handleDelete(detailEntry)}
                >
                  🗑 Delete
                </button>
                <button
                  className="btn btn-ghost"
                  onClick={() => setDetailEntry(null)}
                >
                  Close
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setDetailEntry(null);
                    setModalEntry(detailEntry);
                  }}
                >
                  ✏️ Edit
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
