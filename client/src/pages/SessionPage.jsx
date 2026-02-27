import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CardPanel } from '../components/CardPanel';
import { API_BASE } from '../api/http';
import { sessionApi } from '../api/sessions';
import { studyApi } from '../api/studies';
import { researchApi } from '../api/research';
import './SessionPage.css';

const MODULE_LABELS = {
  questionnaire: 'Interview',
  card_sort: 'Card Sorting',
  image_rating: 'Bildbewertung',
};

function defaultModulesForStudy(study) {
  const type = String(study?.type || 'mixed');
  if (type === 'questionnaire') return ['questionnaire'];
  if (type === 'card_sort') return ['card_sort'];
  if (type === 'image_rating') return ['image_rating'];
  if (type === 'task_work') return [];
  return ['questionnaire', 'card_sort', 'image_rating'];
}

function sanitizeInteractiveHtml(html) {
  if (!html) return '';
  const styleBlocks = [];
  const stylePattern = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let styleMatch = stylePattern.exec(String(html));
  while (styleMatch) {
    let css = String(styleMatch[1] || '');
    css = css.replace(/\bhtml\b/g, '.task-html-root');
    css = css.replace(/\bbody\b/g, '.task-html-root');
    styleBlocks.push(css);
    styleMatch = stylePattern.exec(String(html));
  }
  const bodyMatch = String(html).match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let content = bodyMatch ? bodyMatch[1] : String(html);
  content = content.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
  content = content.replace(/<link[\s\S]*?>/gi, '');
  const styleTag = styleBlocks.length ? `<style>${styleBlocks.join('\n')}</style>` : '';
  return `${styleTag}<div class="task-html-root">${content}</div>`;
}

function normalizeTextForCompare(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('de-DE');
}

export function SessionPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [study, setStudy] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [cards, setCards] = useState([]);
  const [cardSortColumns, setCardSortColumns] = useState([]);
  const [images, setImages] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [taskResponses, setTaskResponses] = useState({});
  const [taskHtmlByPath, setTaskHtmlByPath] = useState({});
  const [taskActiveStepById, setTaskActiveStepById] = useState({});
  const [questionAnswers, setQuestionAnswers] = useState({});
  const [cardAssignments, setCardAssignments] = useState({});
  const [customColumns, setCustomColumns] = useState([]);
  const [customColumnInput, setCustomColumnInput] = useState('');
  const [customCards, setCustomCards] = useState([]);
  const [customCardLabel, setCustomCardLabel] = useState('');
  const [draggedCardId, setDraggedCardId] = useState('');
  const [snapCardId, setSnapCardId] = useState('');
  const snapTimerRef = useRef(null);
  const [imageInputs, setImageInputs] = useState({});
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('info');
  const [activeModule, setActiveModule] = useState('');

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
        const loadedTasks = await studyApi.getTasks(s.study_id);
        setQuestions(q || []);
        setCards(c || []);
        setCardSortColumns(columns || []);
        setImages(i || []);
        setTasks(loadedTasks || []);

        const [savedAnswers, savedCardSort, savedRatings] = await Promise.all([
          researchApi.getAnswersBySession(s._id),
          researchApi.getCardSortBySession(s._id),
          researchApi.getImageRatingsBySession(s._id),
        ]);
        const savedTaskResponses = await researchApi.getTaskResponsesBySession(s._id);

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
        setTaskResponses(
          Object.fromEntries(
            (savedTaskResponses || []).map((entry) => [
              `${String(entry.task_id)}:${Number(entry.step_index || 0)}`,
              {
                selected_ids: Array.isArray(entry.selected_ids) ? entry.selected_ids : [],
                is_correct: !!entry.is_correct,
                result_status: entry.result_status || 'incorrect',
              },
            ])
          )
        );

        const orderedModules = st.module_order?.length ? st.module_order : defaultModulesForStudy(st);
        const available = orderedModules.filter((m) => {
          if (m === 'questionnaire') return (q || []).length > 0;
          if (m === 'card_sort') return (c || []).length > 0 && (columns || []).length > 0;
          if (m === 'image_rating') return (i || []).length > 0;
          return true;
        });
        setActiveModule(available[0] || '');
      } catch (err) {
        setMessage(err.message);
        setMessageType('error');
      }
    })();
  }, [sessionId]);

  useEffect(
    () => () => {
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
    },
    []
  );

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

  const getTaskFiles = (task) =>
    task.attachments?.length > 0
      ? task.attachments
      : task.attachment_path
        ? [{
            path: task.attachment_path,
            format:
              task.content_format ||
              (String(task.attachment_name || '').toLowerCase().endsWith('.pdf') ? 'pdf' : 'html'),
          }]
        : [];

  useEffect(() => {
    const htmlPaths = tasks
      .flatMap((task) => getTaskFiles(task))
      .filter((file) => file.format === 'html' && file.path)
      .map((file) => file.path);
    const uniquePaths = Array.from(new Set(htmlPaths));
    if (uniquePaths.length === 0) {
      setTaskHtmlByPath({});
      return;
    }

    (async () => {
      const loadedEntries = await Promise.all(
        uniquePaths.map(async (path) => {
          try {
            const res = await fetch(`${API_BASE}${path}`);
            const text = await res.text();
            return [path, sanitizeInteractiveHtml(text)];
          } catch {
            return [path, ''];
          }
        })
      );
      setTaskHtmlByPath(Object.fromEntries(loadedEntries));
    })();
  }, [tasks]);

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
      const orderedModules = study.module_order?.length ? study.module_order : defaultModulesForStudy(study);

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

      const interactiveTaskSteps = tasks
        .filter(
          (task) =>
            Array.isArray(task.config?.interactive?.selectable_ids) &&
            task.config.interactive.selectable_ids.length > 0
        )
        .flatMap((task) => {
          const sortedSteps = Array.isArray(task.steps) && task.steps.length > 0
            ? [...task.steps].sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0))
            : [{ prompt: task.description || '', order_index: 0, correct_ids: task.config?.interactive?.correct_ids || [] }];
          return sortedSteps.map((_, idx) => `${String(task._id)}:${idx}`);
        });
      const unansweredTasks = interactiveTaskSteps.filter((key) => !taskResponses[key]);
      if (unansweredTasks.length > 0) {
        setMessageType('error');
        setMessage('Bitte zuerst alle interaktiven Aufgaben beantworten.');
        return;
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

  const orderedModules = study.module_order?.length ? study.module_order : defaultModulesForStudy(study);
  const modules = orderedModules.filter((m) => {
    if (m === 'questionnaire') return questions.length > 0;
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
  const customCardsIndexed = customCards.map((item, idx) => ({ ...item, idx }));
  const unassignedCustomCards = customCardsIndexed.filter((item) => !String(item.column || '').trim());
  const unassignedCount = unassignedCards.length + unassignedCustomCards.length;
  const getColumnColor = (label) => {
    const index = availableColumns.findIndex((x) => x === label);
    const palette = [
      '#f8e66b', // classic post-it yellow
      '#bfe89f', // soft post-it green
      '#9fd6ff', // soft post-it blue
      '#ffd3a6', // light peach
    ];
    return palette[index >= 0 ? index % palette.length : 0];
  };
  const handleDropOnColumn = (event, columnLabel) => {
    event.preventDefault();
    const adminCardId = event.dataTransfer.getData('application/x-admin-card');
    if (adminCardId) {
      setCardAssignments((prev) => ({ ...prev, [adminCardId]: columnLabel }));
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
      setSnapCardId(adminCardId);
      snapTimerRef.current = setTimeout(() => setSnapCardId(''), 260);
      return;
    }
    const customIdx = event.dataTransfer.getData('application/x-custom-card');
    if (customIdx !== '') {
      const idx = Number(customIdx);
      if (Number.isNaN(idx)) return;
      setCustomCards((prev) => prev.map((item, i) => (i === idx ? { ...item, column: columnLabel } : item)));
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
      setSnapCardId(`custom-${idx}`);
      snapTimerRef.current = setTimeout(() => setSnapCardId(''), 260);
    }
  };
  const handleDropOnUnassigned = (event) => {
    event.preventDefault();
    const adminCardId = event.dataTransfer.getData('application/x-admin-card');
    if (adminCardId) {
      setCardAssignments((prev) => ({ ...prev, [adminCardId]: '' }));
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
      setSnapCardId(adminCardId);
      snapTimerRef.current = setTimeout(() => setSnapCardId(''), 260);
      return;
    }
    const customIdx = event.dataTransfer.getData('application/x-custom-card');
    if (customIdx !== '') {
      const idx = Number(customIdx);
      if (Number.isNaN(idx)) return;
      setCustomCards((prev) => prev.map((item, i) => (i === idx ? { ...item, column: '' } : item)));
      if (snapTimerRef.current) clearTimeout(snapTimerRef.current);
      setSnapCardId(`custom-${idx}`);
      snapTimerRef.current = setTimeout(() => setSnapCardId(''), 260);
    }
  };
  const startDragAdminCard = (event, cardId) => {
    event.dataTransfer.setData('application/x-admin-card', cardId);
    setDraggedCardId(cardId);
  };
  const startDragCustomCard = (event, idx) => {
    event.dataTransfer.setData('application/x-custom-card', String(idx));
    setDraggedCardId(`custom-${idx}`);
  };
  const endDragAdminCard = () => setDraggedCardId('');
  const selectAndPersistTaskAnswer = async (task, stepIndex, answerId, allowedIds) => {
    if (!session || isReadOnly) return;
    const taskId = String(task._id);
    const responseKey = `${taskId}:${Number(stepIndex || 0)}`;
    const current = taskResponses[responseKey] || { selected_ids: [] };
    const currentIds = Array.isArray(current.selected_ids) ? current.selected_ids : [];
    const exists = currentIds.includes(answerId);
    const allowedSet = new Set(allowedIds || []);
    const selected = (exists ? currentIds.filter((x) => x !== answerId) : [...currentIds, answerId]).filter((x) =>
      allowedSet.has(x)
    );
    setTaskResponses((prev) => ({
      ...prev,
      [responseKey]: {
        ...(prev[responseKey] || {}),
        selected_ids: selected,
      },
    }));
    try {
      const result = await researchApi.submitTaskResponse({
        session_id: session._id,
        task_id: taskId,
        step_index: Number(stepIndex || 0),
        selected_ids: selected,
      });
      setTaskResponses((prev) => ({
        ...prev,
        [responseKey]: {
          selected_ids: result.selected_ids || [],
          is_correct: !!result.is_correct,
          result_status: result.result_status || 'incorrect',
        },
      }));
      setMessageType(result.is_correct ? 'success' : 'error');
      setMessage(result.is_correct ? 'Antwort gespeichert: korrekt.' : 'Antwort gespeichert: falsch.');
    } catch (err) {
      setMessageType('error');
      setMessage(err.message || 'Antwort konnte nicht gespeichert werden.');
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

      {tasks.length > 0 && (
        <CardPanel>
          {tasks.map((task) => (
            <div key={task._id} className="task-view-item">
              {(() => {
                const files = getTaskFiles(task);
                const interactiveIds = Array.isArray(task.config?.interactive?.selectable_ids)
                  ? task.config.interactive.selectable_ids
                  : [];
                const configuredFilePath = String(task.config?.interactive?.file_path || '');
                const htmlFile = files.find((f) => f.format === 'html' && f.path === configuredFilePath)
                  || files.find((f) => f.format === 'html' && f.path);
                const interactiveEnabled = interactiveIds.length > 0 && !!htmlFile?.path;
                const taskId = String(task._id);
                const taskSteps = Array.isArray(task.steps) && task.steps.length > 0
                  ? [...task.steps].sort((a, b) => Number(a.order_index || 0) - Number(b.order_index || 0))
                  : [{ prompt: task.description || '', order_index: 0, correct_ids: task.config?.interactive?.correct_ids || [] }];
                const firstStepText = taskSteps[0]?.prompt || '';
                const showTaskDescription =
                  !!String(task.description || '').trim() &&
                  normalizeTextForCompare(task.description) !== normalizeTextForCompare(firstStepText);
                const firstOpenStepIdx = taskSteps.findIndex((_, idx) => !taskResponses[`${taskId}:${idx}`]);
                const defaultStepIdx = firstOpenStepIdx === -1 ? Math.max(taskSteps.length - 1, 0) : firstOpenStepIdx;
                const stepFromUi = Number(taskActiveStepById[taskId]);
                const activeStepIdx =
                  Number.isFinite(stepFromUi) && stepFromUi >= 0 && stepFromUi < taskSteps.length
                    ? stepFromUi
                    : defaultStepIdx;
                const activeStep = taskSteps[activeStepIdx] || { prompt: '' };
                const responseKey = `${taskId}:${activeStepIdx}`;
                const selectedIds = Array.isArray(taskResponses[responseKey]?.selected_ids)
                  ? taskResponses[responseKey].selected_ids
                  : [];
                const taskResult = taskResponses[responseKey];

                return (
                  <>
              <h4>Aufgabe: {task.title}</h4>
              {showTaskDescription && <p>Aufgabenbeschreibung: {task.description}</p>}
              {files.map((file, idx) => (
                <div key={`${task._id}-file-${idx}`} className="task-file-render">
                  {file.format === 'pdf' && (
                    <iframe
                      title={`task-pdf-${task._id}-${idx}`}
                      src={`${API_BASE}${file.path}`}
                      className="task-frame"
                    />
                  )}
                  {file.format === 'html' && !interactiveEnabled && taskHtmlByPath[file.path] && (
                    <div
                      className="task-html-interactive"
                      onClick={(event) => {
                        const summaryTarget = event.target.closest('details > summary');
                        if (summaryTarget) {
                          event.preventDefault();
                          const currentDetails = summaryTarget.parentElement;
                          const root = summaryTarget.closest('.task-html-root') || event.currentTarget;
                          const allDetails = root.querySelectorAll('details');
                          allDetails.forEach((el) => {
                            if (el !== currentDetails) el.removeAttribute('open');
                          });
                          if (currentDetails.hasAttribute('open')) {
                            currentDetails.removeAttribute('open');
                          } else {
                            currentDetails.setAttribute('open', '');
                          }
                          return;
                        }
                        const linkTarget = event.target.closest('a[href]');
                        if (linkTarget) event.preventDefault();
                      }}
                      dangerouslySetInnerHTML={{ __html: taskHtmlByPath[file.path] }}
                    />
                  )}
                </div>
              ))}
              {interactiveEnabled && htmlFile?.path && (
                <div className="task-interactive-box">
                  <p>
                    <strong>
                      Schritt {activeStepIdx + 1}{taskSteps.length > 1 ? ` von ${taskSteps.length}` : ''}:
                    </strong>{' '}
                    {activeStep?.prompt || '-'}
                  </p>
                  {taskSteps.length > 1 && (
                    <div className="step-nav">
                      <button
                        type="button"
                        className="ghost-btn"
                        disabled={activeStepIdx <= 0}
                        onClick={() =>
                          setTaskActiveStepById((prev) => ({ ...prev, [taskId]: Math.max(0, activeStepIdx - 1) }))
                        }
                      >
                        Schritt zurück
                      </button>
                      <button
                        type="button"
                        className="ghost-btn"
                        disabled={activeStepIdx >= taskSteps.length - 1}
                        onClick={() =>
                          setTaskActiveStepById((prev) => ({
                            ...prev,
                            [taskId]: Math.min(taskSteps.length - 1, activeStepIdx + 1),
                          }))
                        }
                      >
                        Schritt weiter
                      </button>
                    </div>
                  )}
                  <small>Klicke direkt in der HTML-Vorschau auf das passende Element.</small>
                  {taskHtmlByPath[htmlFile.path] && (
                    <div
                      className="task-html-interactive"
                      onClick={async (event) => {
                        if (isReadOnly) return;
                        const summaryTarget = event.target.closest('details > summary');
                        if (summaryTarget) {
                          event.preventDefault();
                          const currentDetails = summaryTarget.parentElement;
                          const root = summaryTarget.closest('.task-html-root') || event.currentTarget;
                          const allDetails = root.querySelectorAll('details');
                          allDetails.forEach((el) => {
                            if (el !== currentDetails) el.removeAttribute('open');
                          });
                          if (currentDetails.hasAttribute('open')) {
                            currentDetails.removeAttribute('open');
                          } else {
                            currentDetails.setAttribute('open', '');
                          }
                          return;
                        }
                        const dataTarget = event.target.closest('[data-answer-id]');
                        const linkTarget = event.target.closest('a[href]');
                        if (!dataTarget && !linkTarget) return;
                        if (linkTarget) event.preventDefault();
                        const answerId = dataTarget
                          ? String(dataTarget.getAttribute('data-answer-id') || '').trim()
                          : String(linkTarget.getAttribute('href') || '').trim();
                        if (!answerId || !interactiveIds.includes(answerId)) return;
                        await selectAndPersistTaskAnswer(task, activeStepIdx, answerId, interactiveIds);
                      }}
                      dangerouslySetInnerHTML={{ __html: taskHtmlByPath[htmlFile.path] }}
                    />
                  )}
                  {taskResult && (
                    <p
                      className={taskResult.is_correct ? 'info-text success' : 'info-text error'}
                    >
                      {taskResult.is_correct ? 'Ergebnis: korrekt' : 'Ergebnis: falsch'}
                    </p>
                  )}
                </div>
              )}
                  </>
                );
              })()}
            </div>
          ))}
        </CardPanel>
      )}

      {modules.includes('questionnaire') && activeModule === 'questionnaire' && (
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

      {modules.includes('card_sort') && activeModule === 'card_sort' && (
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
                <h4>{unassignedCount === 0 ? 'Alle Cards zugeordnet' : 'Nicht zugeordnete Cards'}</h4>
                <div className="postit-wrap">
                  {unassignedCards.map((c) => (
                    <button
                      key={c._id}
                      type="button"
                      className={`postit-card bw ${draggedCardId === c._id ? 'is-dragging' : ''} ${
                        snapCardId === c._id ? 'is-snap' : ''
                      }`}
                      draggable={!isReadOnly}
                      onDragStart={(e) => startDragAdminCard(e, c._id)}
                      onDragEnd={endDragAdminCard}
                    >
                      {c.label}
                    </button>
                  ))}
                  {unassignedCustomCards.map((item) => (
                    <button
                      key={`custom-unassigned-${item.idx}`}
                      type="button"
                      className={`postit-card bw ${draggedCardId === `custom-${item.idx}` ? 'is-dragging' : ''} ${
                        snapCardId === `custom-${item.idx}` ? 'is-snap' : ''
                      }`}
                      draggable={!isReadOnly}
                      onDragStart={(e) => startDragCustomCard(e, item.idx)}
                      onDragEnd={endDragAdminCard}
                    >
                      {item.label}
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
                            className={`postit-card colored ${draggedCardId === c._id ? 'is-dragging' : ''} ${
                              snapCardId === c._id ? 'is-snap' : ''
                            }`}
                            style={{ '--postit-color': color }}
                            draggable={!isReadOnly}
                            onDragStart={(e) => startDragAdminCard(e, c._id)}
                            onDragEnd={endDragAdminCard}
                          >
                            {c.label}
                          </button>
                        ))}
                        {customCardsIndexed
                          .filter((item) => String(item.column || '').trim() === col)
                          .map((item) => (
                            <button
                              key={`custom-assigned-${col}-${item.idx}`}
                              type="button"
                              className={`postit-card colored ${draggedCardId === `custom-${item.idx}` ? 'is-dragging' : ''} ${
                                snapCardId === `custom-${item.idx}` ? 'is-snap' : ''
                              }`}
                              style={{ '--postit-color': color }}
                              draggable={!isReadOnly}
                              onDragStart={(e) => startDragCustomCard(e, item.idx)}
                              onDragEnd={endDragAdminCard}
                            >
                              {item.label}
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
                          setCustomCards([...customCards, { label, column: '' }]);
                          setCustomCardLabel('');
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
                        <span>{item.label} {item.column ? `→ ${item.column}` : '(in Nicht zugeordnete Cards)'}</span>
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

      {modules.includes('image_rating') && activeModule === 'image_rating' && (
        <CardPanel title={isReadOnly ? 'Bildbewertung ansehen' : 'Bildbewertung bearbeiten'}>
          {images.length === 0 && <p>Keine Bilder vorhanden.</p>}
          {images.map((img) => (
            <div className="image-row" key={img._id}>
              <img
                src={`${API_BASE}/uploads/${String(img.path || '').split('/').pop()}`}
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
