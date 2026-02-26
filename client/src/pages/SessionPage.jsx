import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CardPanel } from '../components/CardPanel';
import { sessionApi } from '../api/sessions';
import { studyApi } from '../api/studies';
import { researchApi } from '../api/research';
import './SessionPage.css';

const MODULE_LABELS = {
  questionnaire: 'Interview',
  card_sort: 'Card Sorting',
  image_rating: 'Bildbewertung',
};

export function SessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [study, setStudy] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [cards, setCards] = useState([]);
  const [cardSortColumns, setCardSortColumns] = useState([]);
  const [images, setImages] = useState([]);
  const [questionAnswers, setQuestionAnswers] = useState({});
  const [cardAssignments, setCardAssignments] = useState({});
  const [customColumns, setCustomColumns] = useState([]);
  const [customColumnInput, setCustomColumnInput] = useState('');
  const [customCards, setCustomCards] = useState([]);
  const [customCardLabel, setCustomCardLabel] = useState('');
  const [customCardColumn, setCustomCardColumn] = useState('');
  const [imageInputs, setImageInputs] = useState({});
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [activeModule, setActiveModule] = useState('questionnaire');

  useEffect(() => {
    (async () => {
      try {
        const s = await sessionApi.get(sessionId);
        setSession(s);
        const st = await studyApi.getById(s.study_id);
        setStudy(st);

        const [q, c, columns, i] = await Promise.all([
          studyApi.getQuestions(s.study_id),
          studyApi.getCards(s.study_id),
          studyApi.getCardSortColumns(s.study_id),
          studyApi.getImages(s.study_id),
        ]);
        setQuestions(q || []);
        setCards(c || []);
        setCardSortColumns(columns || []);
        setImages(i || []);

        const [savedAnswers, savedCardSort, savedRatings] = await Promise.all([
          researchApi.getAnswersBySession(s._id),
          researchApi.getCardSortBySession(s._id),
          researchApi.getImageRatingsBySession(s._id),
        ]);

        const answerMap = {};
        for (const a of (savedAnswers || [])) {
          answerMap[a.question_id] = a.response;
        }
        setQuestionAnswers(answerMap);

        const assignments = {};
        if (savedCardSort?.card_groups?.length) {
          for (const group of savedCardSort.card_groups) {
            for (const id of (group.card_ids || [])) {
              assignments[id] = group.group_name;
            }
          }
        }
        setCardAssignments(assignments);
        setCustomColumns(savedCardSort?.user_idea_category?.custom_columns || []);
        setCustomCards(savedCardSort?.user_idea_category?.custom_cards || []);

        const ratingsMap = {};
        for (const r of (savedRatings || [])) {
          ratingsMap[r.image_id] = {
            rating: String(r.rating ?? ''),
            feedback: r.feedback || '',
            recall: r.recall_answer || '',
          };
        }
        setImageInputs(ratingsMap);

        const orderedModules = st.module_order?.length
          ? st.module_order
          : ['questionnaire', 'card_sort', 'image_rating'];
        const available = orderedModules.filter((m) => {
          if (m === 'card_sort') return (c || []).length > 0 && (columns || []).length > 0;
          if (m === 'image_rating') return (i || []).length > 0;
          return true;
        });
        setActiveModule(available[0] || 'questionnaire');
      } catch (err) {
        setMessage(err.message);
        setMessageType('error');
      }
    })();
  }, [sessionId]);

  const persistQuestionnaire = async () => {
    if (!session) return;
    for (const q of questions) {
      if (questionAnswers[q._id] !== undefined && questionAnswers[q._id] !== '') {
        await researchApi.submitAnswer({
          session_id: session._id,
          question_id: q._id,
          response: questionAnswers[q._id],
        });
      }
    }
  };

  const persistCardSort = async () => {
    if (!session || cards.length === 0) return;
    if (cardSortColumns.length === 0) {
      throw new Error('Card-Sorting-Spalten fehlen. Bitte Admin kontaktieren.');
    }
    const allColumns = [
      ...cardSortColumns.map((x) => x.label).filter(Boolean),
      ...customColumns.filter(Boolean),
    ];
    const grouped = new Map();
    for (const label of allColumns) grouped.set(label, []);
    for (const card of cards) {
      const assignedColumn = cardAssignments[card._id];
      if (assignedColumn && grouped.has(assignedColumn)) {
        grouped.get(assignedColumn).push(card._id);
      }
    }
    const card_groups = Array.from(grouped.entries())
      .filter(([, cardIds]) => cardIds.length > 0)
      .map(([group_name, card_ids]) => ({ group_name, card_ids }));

    await researchApi.submitCardSort({
      session_id: session._id,
      card_groups,
      user_idea_category: {
        custom_columns: customColumns,
        custom_cards: customCards,
      },
    });
  };

  const persistImageRatings = async () => {
    if (!session || images.length === 0) return;
    for (const img of images) {
      const input = imageInputs[img._id];
      if (input?.rating) {
        await researchApi.submitImageRating({
          session_id: session._id,
          image_id: img._id,
          rating: Number(input.rating),
          feedback: input.feedback || '',
          recall_answer: input.recall || '',
        });
      }
    }
  };

  const saveQuestionnaire = async () => {
    if (!session) return;
    setMessage('');
    try {
      await persistQuestionnaire();
      setMessage('Interview gespeichert.');
      setMessageType('success');
    } catch (err) {
      setMessage(err.message);
      setMessageType('error');
    }
  };

  const saveCardSort = async () => {
    if (!session) return;
    setMessage('');
    try {
      await persistCardSort();
      setMessage('Card Sorting gespeichert.');
      setMessageType('success');
    } catch (err) {
      setMessage(err.message);
      setMessageType('error');
    }
  };

  const saveImageRatings = async () => {
    if (!session) return;
    setMessage('');
    try {
      await persistImageRatings();
      setMessage('Bildbewertungen gespeichert.');
      setMessageType('success');
    } catch (err) {
      setMessage(err.message);
      setMessageType('error');
    }
  };

  const completeSession = async () => {
    if (!session) return;
    try {
      const orderedModules = study.module_order?.length ? study.module_order : ['questionnaire', 'card_sort', 'image_rating'];

      if (orderedModules.includes('questionnaire')) {
        const unanswered = questions.filter((q) => {
          const value = questionAnswers[q._id];
          return value === undefined || value === null || String(value).trim() === '';
        });
        if (unanswered.length > 0) {
          setMessageType('error');
          setMessage('Bitte zuerst alle Interview-Fragen beantworten.');
          return;
        }
      }

      if (orderedModules.includes('card_sort') && cards.length > 0 && cardSortColumns.length > 0) {
        const assigned = cards.filter((card) => {
          const col = cardAssignments[card._id];
          return !!col && availableColumns.includes(col);
        }).length;
        if (assigned < cards.length) {
          setMessageType('error');
          setMessage('Bitte zuerst alle Card-Sorting-Aufgaben fertigstellen.');
          return;
        }
      }
      if (orderedModules.includes('card_sort') && cards.length > 0 && cardSortColumns.length === 0) {
        setMessageType('error');
        setMessage('Card-Sorting-Spalten fehlen. Bitte Admin kontaktieren.');
        return;
      }

      if (orderedModules.includes('image_rating') && images.length > 0) {
        const rated = images.filter((img) => {
          const value = imageInputs[img._id]?.rating;
          return value !== undefined && value !== null && String(value).trim() !== '';
        }).length;
        if (rated < images.length) {
          setMessageType('error');
          setMessage('Bitte zuerst alle Bildbewertungen fertigstellen.');
          return;
        }
      }
      await persistQuestionnaire();
      await persistCardSort();
      await persistImageRatings();
      await sessionApi.complete(session._id);
      navigate('/');
    } catch (err) {
      setMessage(err.message);
      setMessageType('error');
    }
  };

  if (!session || !study) return <div className="splash">Session wird geladen...</div>;
  const isReadOnly = session.status === 'done';

  const orderedModules = study.module_order?.length ? study.module_order : ['questionnaire', 'card_sort', 'image_rating'];
  const modules = orderedModules.filter((m) => {
    if (m === 'card_sort') return cards.length > 0 && cardSortColumns.length > 0;
    if (m === 'image_rating') return images.length > 0;
    return true;
  });
  const availableColumns = [...cardSortColumns.map((x) => x.label), ...customColumns];
  const maxCustomColumns = cardSortColumns.length;
  const maxCustomCards = cards.length;
  const cardsByColumn = Object.fromEntries(availableColumns.map((label) => [label, []]));
  for (const card of cards) {
    const col = cardAssignments[card._id];
    if (col && cardsByColumn[col]) cardsByColumn[col].push(card);
  }
  const unassignedCards = cards.filter((card) => !cardAssignments[card._id]);
  const getColumnColor = (label) => {
    const index = availableColumns.findIndex((x) => x === label);
    const palette = ['#f59e0b', '#22c55e', '#0ea5e9', '#ec4899', '#8b5cf6', '#ef4444', '#14b8a6', '#84cc16'];
    return palette[index >= 0 ? index % palette.length : 0];
  };
  const handleDropOnColumn = (event, columnLabel) => {
    event.preventDefault();
    const adminCardId = event.dataTransfer.getData('application/x-admin-card');
    if (adminCardId) {
      setCardAssignments((prev) => ({ ...prev, [adminCardId]: columnLabel }));
      return;
    }
    const customIdx = event.dataTransfer.getData('application/x-custom-card');
    if (customIdx !== '') {
      const idx = Number(customIdx);
      if (Number.isNaN(idx)) return;
      setCustomCards((prev) => prev.map((item, i) => (i === idx ? { ...item, column: columnLabel } : item)));
    }
  };
  const handleDropOnUnassigned = (event) => {
    event.preventDefault();
    const adminCardId = event.dataTransfer.getData('application/x-admin-card');
    if (adminCardId) {
      setCardAssignments((prev) => ({ ...prev, [adminCardId]: '' }));
      return;
    }
    const customIdx = event.dataTransfer.getData('application/x-custom-card');
    if (customIdx !== '') {
      const idx = Number(customIdx);
      if (Number.isNaN(idx)) return;
      setCustomCards((prev) => prev.map((item, i) => (i === idx ? { ...item, column: '' } : item)));
    }
  };

  return (
    <div className="session-grid">
      <CardPanel title={`Studie: ${study.name}`}>
        <div className="session-topbar">
          <div className="module-tabs">
            {modules.map((m) => (
              <button
                key={m}
                type="button"
                className={m === activeModule ? 'tab active' : 'tab'}
                onClick={() => setActiveModule(m)}
              >
                {MODULE_LABELS[m] || m}
              </button>
            ))}
          </div>
          {!isReadOnly && (
            <button className="primary-btn" onClick={completeSession}>
              Studienteilnahme abschließen
            </button>
          )}
        </div>
        {message && (
          <p className={messageType === 'error' ? 'info-text error' : 'info-text success'}>
            {message}
          </p>
        )}
      </CardPanel>

      {activeModule === 'questionnaire' && (
        <CardPanel title={isReadOnly ? 'Interview ansehen' : 'Interview bearbeiten'}>
          {questions.length === 0 && <p>Keine Fragen vorhanden.</p>}
          {questions.map((q) => (
            <label className="form-row" key={q._id}>
              <span>{q.text}</span>
              <input
                value={questionAnswers[q._id] || ''}
                disabled={isReadOnly}
                onChange={(e) => setQuestionAnswers({ ...questionAnswers, [q._id]: e.target.value })}
              />
            </label>
          ))}
          {!isReadOnly && <button className="primary-btn" onClick={saveQuestionnaire}>Antworten speichern</button>}
        </CardPanel>
      )}

      {activeModule === 'card_sort' && (
        <CardPanel title={isReadOnly ? 'Card Sorting ansehen' : 'Card Sorting bearbeiten'}>
          {cards.length === 0 && <p>Keine Cards vorhanden.</p>}
          {cardSortColumns.length === 0 && <p>Keine vordefinierten Spalten vorhanden. Admin muss Spalten anlegen.</p>}
          {cardSortColumns.length > 0 && (
            <>
              <div
                className="unassigned-zone"
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDropOnUnassigned}
              >
                <h4>Nicht zugeordnete Cards</h4>
                <div className="postit-wrap">
                  {unassignedCards.map((c) => (
                    <button
                      key={c._id}
                      type="button"
                      className="postit-card bw"
                      draggable={!isReadOnly}
                      onDragStart={(e) => e.dataTransfer.setData('application/x-admin-card', c._id)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="column-board">
                {availableColumns.map((col) => {
                  const color = getColumnColor(col);
                  return (
                    <section
                      key={col}
                      className="column-lane"
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDropOnColumn(e, col)}
                    >
                      <header className="column-head">
                        <span className="column-dot" style={{ background: color }} />
                        <strong>{col}</strong>
                      </header>
                      <div className="postit-wrap">
                        {(cardsByColumn[col] || []).map((c) => (
                          <button
                            key={c._id}
                            type="button"
                            className="postit-card colored"
                            style={{ background: color }}
                            draggable={!isReadOnly}
                            onDragStart={(e) => e.dataTransfer.setData('application/x-admin-card', c._id)}
                          >
                            {c.label}
                          </button>
                        ))}
                      </div>
                    </section>
                  );
                })}
              </div>

              <div className="idea-box">
                <h4>User Cards Idee Kategorie (optional)</h4>
                <small>Eigene Spalten: {customColumns.length}/{maxCustomColumns} • Eigene Cards: {customCards.length}/{maxCustomCards}</small>

                {!isReadOnly && (
                  <div className="idea-grid">
                    <div className="idea-inline">
                      <input
                        value={customColumnInput}
                        onChange={(e) => setCustomColumnInput(e.target.value)}
                        placeholder="Eigene Spalte benennen"
                      />
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() => {
                          const label = customColumnInput.trim();
                          if (!label) return;
                          if (customColumns.length >= maxCustomColumns) {
                            setMessageType('error');
                            setMessage(`Maximal ${maxCustomColumns} eigene Spalten möglich.`);
                            return;
                          }
                          if (availableColumns.includes(label)) return;
                          setCustomColumns([...customColumns, label]);
                          setCustomColumnInput('');
                        }}
                      >
                        Spalte hinzufügen
                      </button>
                    </div>

                    <div className="idea-inline">
                      <input
                        value={customCardLabel}
                        onChange={(e) => setCustomCardLabel(e.target.value)}
                        placeholder="Eigene Card benennen"
                      />
                      <select value={customCardColumn} onChange={(e) => setCustomCardColumn(e.target.value)}>
                        <option value="">Spalte wählen</option>
                        {availableColumns.map((label) => (
                          <option key={`custom-${label}`} value={label}>{label}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="ghost-btn"
                        onClick={() => {
                          const label = customCardLabel.trim();
                          if (!label) return;
                          if (customCards.length >= maxCustomCards) {
                            setMessageType('error');
                            setMessage(`Maximal ${maxCustomCards} eigene Cards möglich.`);
                            return;
                          }
                          setCustomCards([...customCards, { label, column: customCardColumn || '' }]);
                          setCustomCardLabel('');
                          setCustomCardColumn('');
                        }}
                      >
                        Card hinzufügen
                      </button>
                    </div>
                  </div>
                )}

                {customColumns.length > 0 && (
                  <div className="chip-list">
                    {customColumns.map((col) => (
                      <span key={col} className="chip-item">{col}</span>
                    ))}
                  </div>
                )}

                {customCards.length > 0 && (
                  <div className="custom-card-list">
                    {customCards.map((item, idx) => (
                      <div key={`${item.label}-${idx}`} className="list-row">
                        <span>{item.label} {item.column ? `→ ${item.column}` : '(nicht zugeordnet)'}</span>
                        {!isReadOnly && (
                          <select
                            value={item.column || ''}
                            onChange={(e) =>
                              setCustomCards(customCards.map((x, i) => (i === idx ? { ...x, column: e.target.value } : x)))
                            }
                          >
                            <option value="">Spalte wählen</option>
                            {availableColumns.map((label) => (
                              <option key={`cc-${idx}-${label}`} value={label}>{label}</option>
                            ))}
                          </select>
                        )}
                        {!isReadOnly && (
                          <button
                            type="button"
                            className="danger-btn"
                            onClick={() => setCustomCards(customCards.filter((_, i) => i !== idx))}
                          >
                            Entfernen
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
          {!isReadOnly && <button className="primary-btn" onClick={saveCardSort}>Antworten speichern</button>}
        </CardPanel>
      )}

      {activeModule === 'image_rating' && (
        <CardPanel title={isReadOnly ? 'Bildbewertung ansehen' : 'Bildbewertung bearbeiten'}>
          {images.length === 0 && <p>Keine Bilder vorhanden.</p>}
          {images.map((img) => (
            <div className="image-row" key={img._id}>
              <img
                src={`http://localhost:4000/uploads/${String(img.path || '').split('/').pop()}`}
                alt={img.alt_text || 'image'}
              />
              <div className="image-fields">
                <label className="form-row">
                  <span>Rating (1-5)</span>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={imageInputs[img._id]?.rating || ''}
                    disabled={isReadOnly}
                    onChange={(e) =>
                      setImageInputs({
                        ...imageInputs,
                        [img._id]: { ...(imageInputs[img._id] || {}), rating: e.target.value },
                      })
                    }
                  />
                </label>
                <label className="form-row">
                  <span>Feedback</span>
                  <input
                    value={imageInputs[img._id]?.feedback || ''}
                    disabled={isReadOnly}
                    onChange={(e) =>
                      setImageInputs({
                        ...imageInputs,
                        [img._id]: { ...(imageInputs[img._id] || {}), feedback: e.target.value },
                      })
                    }
                  />
                </label>
              </div>
            </div>
          ))}
          {!isReadOnly && <button className="primary-btn" onClick={saveImageRatings}>Antworten speichern</button>}
        </CardPanel>
      )}

    </div>
  );
}
