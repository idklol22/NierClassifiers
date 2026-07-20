class LearnLoop {
  constructor() {
    this.state = {
      appView: 'auth',
      authMode: 'login',
      authName: '',
      authError: '',
      authRole: 'student',
      studentName: 'Maya Chen',
      teacherMode: 'normal',
      exPhase: 'q1',
      studentMode: 'normal',
      hintShown: false,
      confidence: 3,
      q1Selected: null,
      q1Checked: false,
      q1Correct: false,
      q2Selected: null,
      q2Checked: false,
      q2Correct: false,
      hearts: 5,
      totalXp: 350,
      lessonXp: 0,
      streakDays: 12,
      xpChips: [],
      confetti: [],
      flash: null,
      nodeStates: { eq: 'done', denom: 'done', add: 'active', sub: 'locked', mixed: 'locked', word: 'locked' },
      popoverOpen: false,
      popoverNodeId: null,
      lockShakeId: null,
      parallax: { x: 0, y: 0 },
      badgeUnlocked: { detective: false, starter: true, master: false, speed: false },
      justUnlockedBadge: null,
      dailyGoalCurrent: 2,
      dailyGoalTarget: 3,
      view: 'map',
      isStudentLoading: false,
      isStudentEmpty: false,
      isStudentNormal: true,
      isMapView: true,
      isExerciseView: false,
      selection: {},
      selectedClusterId: 'c1',
      selectedStudentKeys: ['maya', 'jordan', 'aisha', 'liam', 'sofia', 'ethan'],
      teacherNote: 'Small-group reteach with fraction strips: show why denominators must match before adding.',
      assignmentMessage: ''
    };

    this.primaryColor = '#6d5ef7';
    this.motionIntensity = 'playful';
    this.livesSystem = true;
    this.INK = '#1a1a2e';

    this.NODES = [
      { id: 'eq', name: 'Equivalent Fractions', x: 15, y: 82 },
      { id: 'denom', name: 'Common Denominators', x: 27, y: 57 },
      { id: 'add', name: 'Fraction Addition', x: 46, y: 36 },
      { id: 'sub', name: 'Fraction Subtraction', x: 68, y: 45 },
      { id: 'mixed', name: 'Mixed Numbers', x: 74, y: 20 },
      { id: 'word', name: 'Word Problems', x: 90, y: 32 }
    ];

    this.EDGES = [['eq', 'denom'], ['denom', 'add'], ['add', 'sub'], ['add', 'mixed'], ['sub', 'word']];

    this.REASONS = {
      eq: "You've shown this across many problem types.",
      denom: 'Recent answers beat your earlier ones on this step.',
      add: 'This checks whether you find a common denominator before adding.',
      sub: "We're not fully sure yet — a couple more answers will confirm it.",
      mixed: 'Not enough evidence yet.',
      word: 'Not enough evidence yet.'
    };

    this.Q1_OPTIONS = [
      { id: 'a', label: '1/2', correct: true },
      { id: 'b', label: '2/3', correct: false },
      { id: 'c', label: '3/4', correct: false },
      { id: 'd', label: '1/4', correct: false }
    ];

    this.Q2_CHIPS = [
      { id: 'x', label: 'numerator', correct: false },
      { id: 'y', label: 'denominator', correct: true },
      { id: 'z', label: 'product', correct: false }
    ];

    this.BADGE_DEFS = [
      { id: 'detective', label: 'Denominator Detective', icon: '★' },
      { id: 'starter', label: 'Momentum Starter', icon: '▲' },
      { id: 'master', label: 'Fraction Master', icon: '✓' },
      { id: 'speed', label: 'Speed Solver', icon: '◆' }
    ];

    this.CLUSTER_DEFS = [
      { id: 'c1', title: 'Adds numerators and denominators straight across', concept: 'Fraction Addition', count: 9, confidence: 'High', evidence: '"3/4 + 1/2" answered as "4/6" — numerator and denominator combined directly.' },
      { id: 'c2', title: 'Scales the denominator but forgets the numerator', concept: 'Scaling Numerators', count: 5, confidence: 'Medium', evidence: '"2/3 → 8/12" but the numerator is left unscaled in the next step.' },
      { id: 'c3', title: 'Treats mixed numbers as two separate fractions', concept: 'Mixed Numbers', count: 6, confidence: 'Low', evidence: 'Whole-number and fraction parts answered independently, not recombined.' }
    ];

    this.STUDENTS = [
      { key: 'maya', name: 'Maya Chen', confidence: 'High' },
      { key: 'jordan', name: 'Jordan Patel', confidence: 'High' },
      { key: 'aisha', name: 'Aisha Osei', confidence: 'Medium' },
      { key: 'liam', name: 'Liam Brooks', confidence: 'High' },
      { key: 'sofia', name: 'Sofia Ramirez', confidence: 'High' },
      { key: 'ethan', name: 'Ethan Wu', confidence: 'Medium' },
      { key: 'grace', name: 'Grace Kim', confidence: 'High' },
      { key: 'noah', name: 'Noah Castillo', confidence: 'High' },
      { key: 'zoe', name: 'Zoe Bennett', confidence: 'Medium' }
    ];
  }

  _hexA(hex, a) {
    const h = hex.replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[char]));
  }

  _confettiCount() {
    const m = this.motionIntensity || 'playful';
    return m === 'calm' ? 0 : m === 'max' ? 30 : 14;
  }

  _burst(big = false, top) {
    const count = this._confettiCount() * (big ? 1.6 : 1);
    if (!count) return;
    const palette = [this.primaryColor, '#12b886', '#ffb020', '#ff6b5e', '#1a1a2e'];
    const now = Date.now();
    const fresh = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 60 + Math.random() * (big ? 160 : 90);
      fresh.push({
        id: now + '-' + i,
        left: 30 + Math.random() * 40,
        top: (top !== undefined ? top : (big ? 15 : 30)) + Math.random() * 10,
        color: palette[i % palette.length],
        dx: Math.round(Math.cos(angle) * dist),
        dy: Math.round(Math.sin(angle) * dist - (big ? 40 : 10)),
        rot: Math.round(Math.random() * 480 - 240),
        delay: Math.round(Math.random() * 120)
      });
    }
    this.state.confetti = this.state.confetti.concat(fresh);
    this.render();
    setTimeout(() => {
      this.state.confetti = [];
      this.render();
    }, 1100);
  }

  _flash(kind) {
    this.state.flash = kind;
    this.render();
    setTimeout(() => {
      this.state.flash = null;
      this.render();
    }, 400);
  }

  setState(patch) {
    this.state = { ...this.state, ...patch };
    this.render();
  }

  handleAuthLogin = () => {
    this.setState({ authMode: 'login', authError: '' });
  }

  handleAuthSignup = () => {
    this.setState({ authMode: 'signup', authError: '' });
  }

  handleAuthRoleStudent = () => {
    this.setState({ authRole: 'student', authError: '' });
  }

  handleAuthRoleTeacher = () => {
    this.setState({ authRole: 'teacher', authError: '' });
  }

  handleSubmitAuth = (event) => {
    event?.preventDefault();
    const nameInput = document.getElementById('auth-name');
    const name = (nameInput?.value || '').trim();
    if (name.length < 2) {
      this.setState({ authError: 'Enter a name with at least 2 characters.' });
      nameInput?.focus();
      return;
    }
    this.setState({
      authName: name.slice(0, 80),
      authError: '',
      appView: this.state.authRole === 'teacher' ? 'teacher-overview' : 'student',
      studentName: name.slice(0, 80)
    });
  }

  handleLogout = () => {
    this.setState({ appView: 'auth' });
  }

  handleNodeClick = (nodeId) => {
    const st = this.state.nodeStates[nodeId];
    if (st === 'active') {
      this.setState({ popoverOpen: true, popoverNodeId: nodeId });
      this._burst(false);
      return;
    }
    if (st === 'locked') {
      this.setState({ lockShakeId: nodeId });
      setTimeout(() => this.setState({ lockShakeId: null }), 500);
    }
  }

  handleStartExercise = () => {
    const activeId = this.NODES.find(n => this.state.nodeStates[n.id] === 'active');
    if (!activeId) return;
    this.setState({
      view: 'exercise',
      isMapView: false,
      isExerciseView: true,
      popoverOpen: false,
      exPhase: 'q1',
      popoverNodeId: activeId.id,
      q1Selected: null,
      q1Checked: false,
      q1Correct: false,
      q2Selected: null,
      q2Checked: false,
      q2Correct: false,
      lessonXp: 0,
      xpChips: [],
      confetti: [],
      flash: null,
      hintShown: false,
      confidence: 3
    });
  }

  handleQuitExercise = () => {
    this.setState({ view: 'map', isMapView: true, isExerciseView: false });
  }

  handleClosePopover = () => {
    this.setState({ popoverOpen: false });
  }

  handleSelectQ1 = (id) => {
    if (!this.state.q1Checked) this.setState({ q1Selected: id });
  }

  handleSelectQ2 = (id) => {
    if (!this.state.q2Checked) this.setState({ q2Selected: id });
  }

  handleShowHint = () => {
    this.setState({ hintShown: true });
  }

  handleConfidenceChange = (value) => {
    const confidence = Math.min(5, Math.max(1, Number.parseInt(value, 10) || 1));
    this.setState({ confidence });
  }

  handleCheckAnswer = () => {
    const onQ1 = this.state.exPhase === 'q1';
    const pool = onQ1 ? this.Q1_OPTIONS : this.Q2_CHIPS;
    const selectedId = onQ1 ? this.state.q1Selected : this.state.q2Selected;
    if (!selectedId) return;

    const correct = !!(pool.find(o => o.id === selectedId) || {}).correct;
    const label = correct ? '+10 · correct answer' : '+2 · nice try';
    const xpGain = correct ? 10 : 2;

    if (correct) {
      this._flash('green');
      this._burst(false);
    } else {
      this._flash('red');
    }

    const unlockDetective = !onQ1 && correct && !this.state.badgeUnlocked.detective;
    const extraChips = [];
    let extraXp = 0;

    if (onQ1) {
      extraChips.push({ label: '+2 · shared confidence', xp: '+2' });
      extraXp += 2;
      if (this.state.hintShown) {
        extraChips.push({ label: '+3 · used a hint', xp: '+3' });
        extraXp += 3;
      }
    }

    this.setState({
      [onQ1 ? 'q1Checked' : 'q2Checked']: true,
      [onQ1 ? 'q1Correct' : 'q2Correct']: correct,
      hearts: correct ? this.state.hearts : Math.max(0, this.state.hearts - 1),
      lessonXp: this.state.lessonXp + xpGain + extraXp,
      xpChips: this.state.xpChips.concat([{ label, xp: '+' + xpGain }], extraChips),
      badgeUnlocked: unlockDetective ? { ...this.state.badgeUnlocked, detective: true } : this.state.badgeUnlocked,
      justUnlockedBadge: unlockDetective ? 'detective' : this.state.justUnlockedBadge
    });

    if (unlockDetective) this._burst(true, 40);
  }

  handleContinueFeedback = () => {
    if (this.state.exPhase === 'q1') {
      this.setState({ exPhase: 'q2' });
      return;
    }
    const bothCorrect = this.state.q1Correct && this.state.q2Correct;
    const bonus = bothCorrect ? [{ label: '+5 · no mistakes', xp: '+5' }] : [];
    this.setState({
      exPhase: 'complete',
      lessonXp: this.state.lessonXp + (bothCorrect ? 5 : 0),
      xpChips: this.state.xpChips.concat(bonus)
    });
    this._burst(true, 20);
  }

  handleFinishLesson = () => {
    const order = this.NODES.map(n => n.id);
    const doneId = this.state.popoverNodeId || 'add';
    const idx = order.indexOf(doneId);
    const nextId = order[idx + 1];
    const nodeStates = { ...this.state.nodeStates, [doneId]: 'done' };
    if (nextId) nodeStates[nextId] = 'active';

    this.setState({
      view: 'map',
      isMapView: true,
      isExerciseView: false,
      nodeStates,
      totalXp: this.state.totalXp + this.state.lessonXp,
      streakDays: this.state.streakDays + 1,
      dailyGoalCurrent: Math.min(this.state.dailyGoalTarget, this.state.dailyGoalCurrent + 1),
      justUnlockedBadge: null
    });

    setTimeout(() => this._burst(true, idx * 12), 50);
  }

  handleGraphMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    this.state.parallax = { x: nx, y: ny };
    const layer = e.currentTarget.firstElementChild;
    if (layer) layer.style.transform = `translate(${nx * 8}px,${ny * 6}px)`;
  }

  handleGraphLeave = () => {
    this.state.parallax = { x: 0, y: 0 };
    const graphContainer = document.getElementById('graph-container');
    const layer = graphContainer?.firstElementChild;
    if (layer) layer.style.transform = 'translate(0px,0px)';
  }

  handleTeacherCluster = (clusterId) => {
    if (!this.CLUSTER_DEFS.some(cluster => cluster.id === clusterId)) return;
    this.setState({ appView: 'teacher-cluster', selectedClusterId: clusterId, assignmentMessage: '' });
  }

  handleBackToOverview = () => {
    this.setState({ appView: 'teacher-overview' });
  }

  handleTeacherStudentToggle = (studentKey, checked) => {
    const selectedStudentKeys = new Set(this.state.selectedStudentKeys);
    if (checked) selectedStudentKeys.add(studentKey);
    else selectedStudentKeys.delete(studentKey);
    const note = document.getElementById('intervention-note')?.value ?? this.state.teacherNote;
    this.setState({ selectedStudentKeys: [...selectedStudentKeys], teacherNote: note, assignmentMessage: '' });
  }

  handleAssignIntervention = () => {
    const selectedStudentKeys = [...document.querySelectorAll('[data-student-key]:checked')].map(input => input.dataset.studentKey);
    const teacherNote = document.getElementById('intervention-note')?.value.trim() || '';
    if (!selectedStudentKeys.length) {
      this.setState({ selectedStudentKeys, teacherNote, assignmentMessage: 'Select at least one student before assigning.' });
      return;
    }
    this.setState({
      selectedStudentKeys,
      teacherNote,
      assignmentMessage: `Follow-up assigned to ${selectedStudentKeys.length} student${selectedStudentKeys.length === 1 ? '' : 's'}.`
    });
  }

  render() {
    const root = document.getElementById('root');
    if (!root) return;
    root.innerHTML = this.renderApp();
    document.title = this.state.appView === 'auth' ? 'LearnLoop' : `LearnLoop · ${this.state.authRole === 'teacher' ? 'Teacher workspace' : 'Fractions'}`;
    this.attachEventListeners();
  }

  renderApp() {
    if (this.state.appView === 'auth') return this.renderAuth();
    if (this.state.appView === 'student') return this.renderStudent();
    if (this.state.appView === 'teacher-overview') return this.renderTeacherOverview();
    if (this.state.appView === 'teacher-cluster') return this.renderTeacherCluster();
    return this.renderStudent();
  }

  renderAuth() {
    const INK = this.INK;
    const primary = this.primaryColor;
    return `
      <div class="auth-shell" style="min-height:100vh;font-family:'Manrope',sans-serif;background-color:#faf6f0;display:flex;align-items:center;justify-content:center;padding:24px;">
        <form id="auth-form" class="auth-card" novalidate style="background:#fff;border:3px solid ${INK};box-shadow:8px 8px 0 ${INK};border-radius:24px;padding:36px 32px;max-width:380px;width:100%;">
          <div style="font-family:'Fredoka',sans-serif;font-weight:700;font-size:24px;color:${INK};text-align:center;margin-bottom:4px;">LearnLoop</div>
          <div style="font-size:13px;color:#8a8578;font-weight:700;text-align:center;margin-bottom:24px;">
            ${this.state.authMode === 'login' ? 'Log in to continue your quests' : 'Create an account to get started'}
          </div>

          <div style="display:flex;gap:2px;background:#faf6f0;border:2px solid ${INK};border-radius:12px;padding:3px;margin-bottom:20px;">
            <button type="button" id="auth-login-btn" aria-pressed="${this.state.authMode === 'login'}" style="flex:1;padding:9px 14px;border:none;border-radius:9px;background:${this.state.authMode === 'login' ? INK : 'transparent'};color:${this.state.authMode === 'login' ? '#fff' : '#8a8578'};font-family:Manrope,sans-serif;font-weight:800;font-size:12.5px;cursor:pointer;">Log in</button>
            <button type="button" id="auth-signup-btn" aria-pressed="${this.state.authMode === 'signup'}" style="flex:1;padding:9px 14px;border:none;border-radius:9px;background:${this.state.authMode === 'signup' ? INK : 'transparent'};color:${this.state.authMode === 'signup' ? '#fff' : '#8a8578'};font-family:Manrope,sans-serif;font-weight:800;font-size:12.5px;cursor:pointer;">Sign up</button>
          </div>

          <div style="margin-bottom:14px;">
            <label for="auth-name" style="display:block;font-family:'Manrope',sans-serif;font-weight:800;font-size:11.5px;color:#8a8578;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px;">Name</label>
            <input type="text" id="auth-name" name="name" value="${this.escapeHtml(this.state.authName)}" placeholder="e.g. Maya Chen" autocomplete="name" minlength="2" maxlength="80" required aria-invalid="${Boolean(this.state.authError)}" style="width:100%;padding:12px 14px;border:2.5px solid ${INK};border-radius:12px;font-family:Manrope,sans-serif;font-size:14px;outline:none;box-sizing:border-box;" />
            ${this.state.authError ? `<div role="alert" style="color:#c2413a;font-size:12px;font-weight:700;margin-top:6px;">${this.escapeHtml(this.state.authError)}</div>` : ''}
          </div>

          <div style="margin-bottom:22px;">
            <div style="font-family:'Manrope',sans-serif;font-weight:800;font-size:11.5px;color:#8a8578;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px;">I am a…</div>
            <div style="display:flex;gap:10px;">
              <button type="button" id="auth-student-btn" aria-pressed="${this.state.authRole === 'student'}" style="flex:1;padding:12px;border:2.5px solid ${INK};border-radius:12px;background:${this.state.authRole === 'student' ? primary : '#fff'};color:${this.state.authRole === 'student' ? '#fff' : INK};font-family:Fredoka,sans-serif;font-weight:700;font-size:13.5px;cursor:pointer;${this.state.authRole === 'student' ? 'box-shadow:3px 3px 0 ' + INK + ';' : ''}">Student</button>
              <button type="button" id="auth-teacher-btn" aria-pressed="${this.state.authRole === 'teacher'}" style="flex:1;padding:12px;border:2.5px solid ${INK};border-radius:12px;background:${this.state.authRole === 'teacher' ? primary : '#fff'};color:${this.state.authRole === 'teacher' ? '#fff' : INK};font-family:Fredoka,sans-serif;font-weight:700;font-size:13.5px;cursor:pointer;${this.state.authRole === 'teacher' ? 'box-shadow:3px 3px 0 ' + INK + ';' : ''}">Teacher</button>
            </div>
          </div>

          <button type="submit" id="submit-auth-btn" style="width:100%;padding:15px;border:2.5px solid ${INK};border-radius:16px;background:${primary};box-shadow:4px 4px 0 ${INK};color:#fff;font-family:Fredoka,sans-serif;font-weight:700;font-size:15px;cursor:pointer;">
            ${this.state.authMode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>
      </div>
    `;
  }

  renderStudent() {
    if (this.state.isExerciseView) return this.renderExercise();
    return this.renderStudentMap();
  }

  renderStudentMap() {
    const INK = this.INK;
    const primary = this.primaryColor;
    const EMERALD = '#12b886';
    const nameParts = (this.state.studentName || 'Maya Chen').trim().split(/\s+/);
    const studentInitials = this.escapeHtml(((nameParts[0] || 'M')[0] + (nameParts[1] || 'C')[0]).toUpperCase());
    const safeStudentName = this.escapeHtml(this.state.studentName || 'Maya Chen');

    const momentumBars = [0, 1, 2].map((i, idx) => {
      const heights = [6, 10, 14];
      return `<span style="display:inline-block;width:4px;height:${heights[i]}px;border-radius:2px;background:${primary};animation:barPop 1.8s ease-in-out infinite;animation-delay:${i * 0.15}s;margin-right:3px;"></span>`;
    }).join('');

    const energySlots = [0, 1, 2, 3, 4].map((i, idx) => {
      const color = i < this.state.hearts ? '#ff6b5e' : '#eee6d9';
      return `<span style="display:inline-block;width:6px;height:16px;border-radius:3px;background:${color};transition:background .3s ease;${i === this.state.hearts ? 'animation:barPop .5s ease-out;' : ''}"></span>`;
    }).join('');

    const nodes = this.NODES.map((n, idx) => {
      const st = this.state.nodeStates[n.id];
      const isActive = st === 'active', isDone = st === 'done', isLocked = st === 'locked';
      const fill = isDone ? EMERALD : isActive ? primary : '#eee6d9';
      const textOnFill = (isDone || isActive) ? '#fff' : '#a39d8f';
      const shake = this.state.lockShakeId === n.id;
      const floatDur = (2.6 + (idx % 3) * 0.4).toFixed(1);
      const floatDelay = (idx * 0.15).toFixed(2);
      const icon = isDone ? '✓' : isActive ? '◆' : '○';
      return `
        <div class="node-${n.id}" role="button" tabindex="0" aria-label="${n.name}: ${isDone ? 'complete' : isActive ? 'up next' : 'locked'}" aria-disabled="${isLocked || isDone}" style="position:absolute;left:${n.x}%;top:${n.y}%;transform:translate(-50%,-50%);display:flex;flex-direction:column;align-items:center;gap:6px;cursor:${isDone ? 'default' : 'pointer'};z-index:2;animation:floatY ${floatDur}s ease-in-out infinite;animation-delay:${floatDelay}s;${shake ? 'animation:shakeX .4s ease-in-out;' : ''}" data-node-id="${n.id}">
          <div style="width:${isActive ? 52 : 44}px;height:${isActive ? 52 : 44}px;border-radius:14px;background:${fill};color:${textOnFill};display:flex;align-items:center;justify-content:center;font-size:${isActive ? 20 : 17}px;font-weight:800;border:2.5px solid ${INK};box-shadow:4px 4px 0 ${INK};${isLocked ? 'opacity:.55;' : ''}${isActive ? `box-shadow:4px 4px 0 ${INK}, 0 0 0 8px ${this._hexA(primary, 0.25)};` : ''}">${icon}</div>
          <div style="font-family:Fredoka,sans-serif;font-weight:700;font-size:11.5px;color:${INK};background:#fff;border:2px solid ${INK};padding:2px 9px;border-radius:999px;white-space:nowrap;">${isDone ? 'Complete' : isActive ? 'Up next' : 'Locked'}</div>
        </div>
      `;
    }).join('');

    const edges = this.EDGES.map(([a, b], i) => {
      const na = this.NODES.find(x => x.id === a);
      const nb = this.NODES.find(x => x.id === b);
      return `<line key="edge-${i}" x1="${na.x}" y1="${na.y}" x2="${nb.x}" y2="${nb.y}" stroke="#e4ddd0" stroke-width="1"></line>`;
    }).join('');

    const confettiPieces = this.state.confetti.map((p, i) => {
      const deg = p.rot || 0;
      const style = `position:absolute;left:${p.left}%;top:${p.top}%;width:8px;height:8px;border-radius:2px;background:${p.color};animation:confettiFly 1s ease-out forwards;--dx:${p.dx}px;--dy:${p.dy}px;--rot:${deg}deg;animation-delay:${p.delay}ms;pointer-events:none;`;
      return `<div style="${style}"></div>`;
    }).join('');

    const activeNode = this.NODES.find(n => this.state.nodeStates[n.id] === 'active');
    const focusName = activeNode ? activeNode.name : 'All caught up!';
    const focusReason = activeNode ? this.REASONS[activeNode.id] : 'No quests are queued right now — check back soon.';

    const badges = this.BADGE_DEFS.map(b => {
      const unlocked = this.state.badgeUnlocked[b.id];
      return `
        <div style="background:${unlocked ? '#fff' : '#faf6f0'};border:2.5px solid ${INK};border-radius:18px;padding:16px;text-align:center;${unlocked ? `box-shadow:4px 4px 0 ${INK};` : 'opacity:.4;'}">
          <div style="font-size:28px;margin-bottom:6px;">${b.icon}</div>
          <div style="font-family:Fredoka,sans-serif;font-weight:700;font-size:12px;color:${INK};">${b.label}</div>
        </div>
      `;
    }).join('');

    const dailyGoalPercentage = (this.state.dailyGoalCurrent / this.state.dailyGoalTarget) * 100;

    return `
      <div class="student-map-shell" style="min-height:100vh;font-family:'Manrope',sans-serif;background-color:#faf6f0;">
        <div style="position:sticky;top:0;z-index:40;background:#faf6f0;border-bottom:3px solid ${INK};">
          <div class="student-topbar" style="max-width:960px;margin:0 auto;padding:14px 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
            <div style="display:flex;align-items:center;gap:12px;">
              <span style="font-family:'Fredoka',sans-serif;font-weight:700;font-size:19px;color:${INK};">LearnLoop</span>
              <div style="display:flex;align-items:center;gap:8px;padding-left:12px;border-left:2px solid #e4ddd0;">
                <div style="width:28px;height:28px;border-radius:9px;background:${primary};border:2px solid ${INK};display:flex;align-items:center;justify-content:center;color:#fff;font-family:Fredoka,sans-serif;font-weight:700;font-size:11px;">${studentInitials}</div>
              <span class="student-name" style="font-family:'Fredoka',sans-serif;font-weight:700;font-size:13px;color:${INK};">${safeStudentName}</span>
              </div>
            </div>
            <div class="student-stat-panel" style="display:flex;align-items:stretch;background:#fff;border:2.5px solid ${INK};border-radius:14px;box-shadow:3px 3px 0 ${INK};overflow:hidden;">
              <div style="display:flex;align-items:center;gap:6px;padding:7px 12px;border-right:2px solid ${INK};">
                ${momentumBars}
                <span style="font-family:'Fredoka',sans-serif;font-weight:700;font-size:13px;color:${INK};margin-left:2px;">${this.state.streakDays}</span>
              </div>
              <div style="display:flex;align-items:center;gap:5px;padding:7px 12px;border-right:2px solid ${INK};">
                <span style="color:${primary};font-size:15px;">◆</span><span style="font-family:'Fredoka',sans-serif;font-weight:700;font-size:13px;color:${INK};">${this.state.totalXp}</span>
              </div>
              <div style="display:flex;align-items:center;gap:3px;padding:7px 12px;">
                ${energySlots}
              </div>
            </div>
            <button id="logout-btn" style="background:none;border:none;color:#a39d8f;font-family:'Manrope',sans-serif;font-weight:700;font-size:12.5px;cursor:pointer;">Log out</button>
          </div>
        </div>

        <div class="student-map-content" style="max-width:820px;margin:0 auto;padding:44px 24px 120px;position:relative;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:28px;flex-wrap:wrap;">
            <div>
              <div style="font-family:'Fredoka',sans-serif;font-weight:700;font-size:24px;color:${INK};margin-bottom:2px;">Fractions</div>
              <div style="font-size:13.5px;color:#8a8578;font-weight:700;">Your quest board — tap the highlighted tile to continue</div>
            </div>
            <div style="display:flex;align-items:center;gap:12px;background:#fff;border:2.5px solid ${INK};box-shadow:4px 4px 0 ${INK};border-radius:16px;padding:10px 16px;">
              <div style="width:60px;height:60px;border-radius:50%;background:conic-gradient(${primary} ${dailyGoalPercentage}%, #eee6d9 ${dailyGoalPercentage}%);border:2.5px solid ${INK};display:flex;align-items:center;justify-content:center;">
                <div style="width:50px;height:50px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-family:Fredoka,sans-serif;font-weight:700;font-size:12px;color:${INK};">${this.state.dailyGoalCurrent}/${this.state.dailyGoalTarget}</div>
              </div>
              <div>
                <div style="font-family:'Fredoka',sans-serif;font-weight:700;font-size:12.5px;color:${INK};">Today's goal</div>
                <div style="font-size:11px;color:#8a8578;font-weight:700;">${this.state.dailyGoalCurrent === this.state.dailyGoalTarget ? 'Complete!' : 'Keep going'}</div>
              </div>
            </div>
          </div>

          <div class="student-recommendation" style="background:#fff;border:2.5px solid ${INK};box-shadow:5px 5px 0 ${INK};border-radius:20px;padding:20px 22px;margin-bottom:32px;display:flex;align-items:center;gap:18px;flex-wrap:wrap;">
            <div style="width:52px;height:52px;border-radius:16px;background:${this._hexA(primary, 0.14)};border:2px solid ${INK};display:flex;align-items:center;justify-content:center;font-size:22px;color:${primary};flex-shrink:0;">◆</div>
            <div style="flex:1;min-width:200px;">
              <div style="font-family:'Manrope',sans-serif;font-weight:800;font-size:11px;color:#8a8578;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px;">Recommended for you</div>
              <div style="font-family:'Fredoka',sans-serif;font-weight:700;font-size:17px;color:${INK};margin-bottom:4px;">${focusName}</div>
              <div style="font-size:13px;color:#6b6558;line-height:1.4;">${focusReason}</div>
            </div>
            <button id="start-exercise-btn" ${activeNode ? '' : 'disabled'} style="padding:13px 20px;border:2.5px solid ${INK};border-radius:14px;background:${activeNode ? primary : '#eee6d9'};box-shadow:${activeNode ? '4px 4px 0 ' + INK : 'none'};color:${activeNode ? '#fff' : '#a39d8f'};font-family:Fredoka,sans-serif;font-weight:700;font-size:13.5px;cursor:${activeNode ? 'pointer' : 'not-allowed'};">${activeNode ? 'Start quest' : 'All quests complete'}</button>
          </div>

          <div class="student-graph" style="background:#fff;border:2.5px solid ${INK};box-shadow:6px 6px 0 ${INK};border-radius:22px;padding:20px;position:relative;overflow:hidden;height:360px;" id="graph-container">
            <div style="position:relative;height:100%;transform:translate(${this.state.parallax.x * 8}px,${this.state.parallax.y * 6}px);transition:transform .25s ease-out;">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style="position:absolute;inset:0;width:100%;height:100%;">
                ${edges}
              </svg>
              ${nodes}
              ${confettiPieces}
            </div>
          </div>

          <div style="font-family:'Fredoka',sans-serif;font-weight:700;font-size:15px;color:${INK};margin:36px 0 14px;">Badges</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:14px;">
            ${badges}
          </div>

          ${this.state.popoverOpen && this.NODES.find(n => n.id === this.state.popoverNodeId) ? this.renderPopover() : ''}
        </div>
      </div>
    `;
  }

  renderPopover() {
    const INK = this.INK;
    const primary = this.primaryColor;
    const popNode = this.NODES.find(n => n.id === this.state.popoverNodeId);
    if (!popNode) return '';

    return `
      <div id="popover-backdrop" style="position:fixed;inset:0;background:rgba(26,26,46,.5);z-index:50;display:flex;align-items:center;justify-content:center;padding:20px;">
        <div id="quest-dialog" role="dialog" aria-modal="true" aria-labelledby="quest-dialog-title" tabindex="-1" style="background:#fff;border:3px solid ${INK};box-shadow:8px 8px 0 ${INK};border-radius:22px;padding:28px 26px;max-width:360px;width:100%;text-align:center;animation:cardIn .3s cubic-bezier(.34,1.56,.64,1);">
          <div style="width:56px;height:56px;border-radius:16px;background:${this._hexA(primary, 0.14)};color:${primary};border:2.5px solid ${INK};display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800;margin:0 auto 14px;">◆</div>
          <div id="quest-dialog-title" style="font-family:'Fredoka',sans-serif;font-weight:700;font-size:19px;color:${INK};margin-bottom:8px;">${popNode.name}</div>
          <div style="font-size:13.5px;color:#6b6558;line-height:1.5;margin-bottom:20px;">${this.REASONS[popNode.id]}</div>
          <button id="popover-start-btn" style="width:100%;padding:13px;border:2.5px solid ${INK};border-radius:14px;background:${primary};box-shadow:4px 4px 0 ${INK};color:#fff;font-family:Fredoka,sans-serif;font-weight:700;font-size:13.5px;cursor:pointer;margin-bottom:8px;">Start quest</button>
          <button id="popover-close-btn" style="background:none;border:none;color:#a39d8f;font-family:'Manrope',sans-serif;font-weight:700;font-size:13px;cursor:pointer;width:100%;">Not now</button>
        </div>
      </div>
    `;
  }

  renderExercise() {
    const INK = this.INK;
    const primary = this.primaryColor;
    const EMERALD = '#12b886';
    const CORAL = '#ff6b5e';
    const exPhase = this.state.exPhase;
    const isQ1 = exPhase === 'q1', isQ2 = exPhase === 'q2', isComplete = exPhase === 'complete';
    const feedbackShown = (isQ1 && this.state.q1Checked) || (isQ2 && this.state.q2Checked);
    const checked = isQ1 ? this.state.q1Checked : this.state.q2Checked;
    const correct = isQ1 ? this.state.q1Correct : this.state.q2Correct;
    const selectedId = isQ1 ? this.state.q1Selected : this.state.q2Selected;

    const progressPercentage = (isQ1 ? 25 : isQ2 ? 75 : 100);

    const confettiPieces = this.state.confetti.map((p, i) => {
      const style = `position:absolute;left:${p.left}%;top:${p.top}%;width:8px;height:8px;border-radius:2px;background:${p.color};animation:confettiFly 1s ease-out forwards;--dx:${p.dx}px;--dy:${p.dy}px;--rot:${p.rot || 0}deg;animation-delay:${p.delay}ms;pointer-events:none;`;
      return `<div style="${style}"></div>`;
    }).join('');

    const flashBg = this.state.flash ? (this.state.flash === 'green' ? this._hexA(EMERALD, 0.15) : this._hexA(CORAL, 0.15)) : 'transparent';

    return `
      <div class="exercise-shell" style="min-height:100vh;font-family:'Manrope',sans-serif;background-color:${flashBg};transition:background-color .2s ease;">
        <div style="position:sticky;top:0;z-index:40;background:#faf6f0;border-bottom:3px solid ${INK};">
          <div style="max-width:600px;margin:0 auto;padding:14px 24px;">
            <div style="display:flex;align-items:center;gap:14px;">
              <button id="quit-exercise-btn" style="background:none;border:none;color:#a39d8f;font-size:24px;font-weight:800;cursor:pointer;padding:0;line-height:1;">×</button>
              <div role="progressbar" aria-label="Quest progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progressPercentage}" style="flex:1;height:14px;border-radius:999px;background:#eee6d9;border:2px solid ${INK};overflow:hidden;">
                <div style="background:${primary};height:100%;width:${progressPercentage}%;transition:width .3s ease;"></div>
              </div>
            </div>
          </div>
        </div>

        <div style="min-height:calc(100vh - 64px);display:flex;flex-direction:column;">
          <div class="exercise-content" style="max-width:600px;margin:0 auto;padding:24px 24px 24px;width:100%;">
            ${isQ1 ? `
              <div style="font-family:'Fredoka',sans-serif;font-weight:700;font-size:24px;color:${INK};line-height:1.3;margin-bottom:28px;">Which fraction is equivalent to <span style="color:${primary};">2/4</span>?</div>
              <div class="exercise-option-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:22px;">
                ${this.Q1_OPTIONS.map(o => {
                  let bg = '#fff', border = INK, color = INK, shadow = 'true';
                  if (checked) {
                    if (o.correct) { bg = this._hexA(EMERALD, 0.16); color = INK; }
                    else if (selectedId === o.id) { bg = this._hexA(CORAL, 0.16); color = INK; }
                    else { bg = '#fff'; color = '#c9c2b3'; border = '#e4ddd0'; shadow = 'false'; }
                  } else if (selectedId === o.id) {
                    bg = this._hexA(primary, 0.14); color = INK;
                  }
                  return `
                    <button type="button" class="q1-option" data-id="${o.id}" aria-pressed="${selectedId === o.id}" ${checked ? 'disabled' : ''} style="text-align:left;padding:18px 20px;border-radius:16px;background:${bg};border:2.5px solid ${border};color:${color};font-family:Fredoka,sans-serif;font-weight:700;font-size:17px;cursor:${checked ? 'default' : 'pointer'};transition:transform .12s ease,background .2s ease;${shadow === 'true' ? 'box-shadow:4px 4px 0 ' + border + ';' : ''}">${o.label}</button>
                  `;
                }).join('')}
              </div>
              ${!this.state.hintShown ? `
                <button id="show-hint-btn" style="background:none;border:2px dashed ${INK};color:${INK};font-family:Manrope,sans-serif;font-weight:800;font-size:12.5px;padding:8px 14px;border-radius:10px;cursor:pointer;margin-bottom:18px;">Need a hint?</button>
              ` : `
                <div style="background:${this._hexA(primary, 0.14)};color:${INK};border:2px solid ${INK};font-size:13px;font-weight:700;line-height:1.5;padding:12px 14px;border-radius:12px;margin-bottom:18px;">Look for a fraction that has the same value when you divide both numbers by 2.</div>
              `}
              <div style="margin-bottom:6px;">
                <div style="display:flex;justify-content:space-between;font-size:12px;color:#8a8578;font-weight:800;margin-bottom:6px;">
                  <span>How sure are you?</span>
                  <span>${['Not sure', 'A bit', 'Fairly sure', 'Very sure', 'Certain'][this.state.confidence - 1]}</span>
                </div>
                <input type="range" id="confidence-slider" min="1" max="5" value="${this.state.confidence}" aria-label="Confidence" style="width:100%;accent-color:${primary};" />
              </div>
            ` : isQ2 ? `
              <div style="font-family:'Fredoka',sans-serif;font-weight:700;font-size:24px;color:${INK};line-height:1.4;margin-bottom:26px;">Tap the word to complete the sentence</div>
              <div style="background:#fff;border:2.5px solid ${INK};border-radius:18px;padding:22px;margin-bottom:30px;font-family:'Manrope',sans-serif;font-weight:800;font-size:18px;color:${INK};line-height:1.7;">
                To add fractions, you first need a common <span style="display:inline-block;min-width:80px;text-align:center;border-bottom:3px solid ${this.state.q2Checked ? (this.state.q2Correct ? EMERALD : CORAL) : primary};color:${INK};font-weight:800;">${this.state.q2Selected ? this.Q2_CHIPS.find(c => c.id === this.state.q2Selected)?.label : '_______'}</span>.
              </div>
              <div style="display:flex;flex-wrap:wrap;gap:12px;">
                ${this.Q2_CHIPS.map(c => {
                  let bg = '#fff', border = INK, color = INK, shadow = 'true';
                  if (checked) {
                    if (c.correct) { bg = this._hexA(EMERALD, 0.16); color = INK; }
                    else if (selectedId === c.id) { bg = this._hexA(CORAL, 0.16); color = INK; }
                    else { bg = '#fff'; color = '#c9c2b3'; border = '#e4ddd0'; shadow = 'false'; }
                  } else if (selectedId === c.id) {
                    bg = this._hexA(primary, 0.14); color = INK;
                  }
                  return `
                    <button type="button" class="q2-option" data-id="${c.id}" aria-pressed="${selectedId === c.id}" ${checked ? 'disabled' : ''} style="padding:10px 18px;border-radius:999px;background:${bg};border:2.5px solid ${border};color:${color};font-family:Fredoka,sans-serif;font-weight:700;font-size:14px;cursor:${checked ? 'default' : 'pointer'};${shadow === 'true' ? 'box-shadow:3px 3px 0 ' + border + ';' : ''}">${c.label}</button>
                  `;
                }).join('')}
              </div>
            ` : `
              <div style="display:flex;flex-direction:column;align-items:center;text-align:center;padding-top:20px;position:relative;">
                <div style="font-size:52px;margin-bottom:8px;animation:popIn .5s cubic-bezier(.34,1.56,.64,1);">◆</div>
                <div style="font-family:'Fredoka',sans-serif;font-weight:700;font-size:26px;color:${INK};margin-bottom:4px;">Quest complete!</div>
                <div style="font-size:14px;color:#8a8578;font-weight:700;margin-bottom:26px;">Fraction Addition</div>

                <div style="display:flex;gap:12px;margin-bottom:24px;">
                  <div style="background:#fff;border:2.5px solid ${INK};box-shadow:4px 4px 0 ${INK};border-radius:16px;padding:16px 22px;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:96px;">
                    <div style="font-family:'Fredoka',sans-serif;font-weight:700;font-size:22px;color:${primary};">${this.state.lessonXp}</div>
                    <div style="font-size:11.5px;font-weight:800;color:#8a8578;text-transform:uppercase;letter-spacing:.04em;">Sparks</div>
                  </div>
                  <div style="background:#fff;border:2.5px solid ${INK};box-shadow:4px 4px 0 ${INK};border-radius:16px;padding:16px 22px;display:flex;flex-direction:column;align-items:center;gap:2px;min-width:96px;">
                    <div style="font-family:'Fredoka',sans-serif;font-weight:700;font-size:22px;color:${INK};">${this.state.streakDays}</div>
                    <div style="font-size:11.5px;font-weight:800;color:#8a8578;text-transform:uppercase;letter-spacing:.04em;">Momentum</div>
                  </div>
                </div>

                <div style="display:flex;flex-direction:column;gap:8px;width:100%;max-width:340px;">
                  ${this.state.xpChips.map((chip, i) => `
                    <div style="background:#fff;border:2px solid ${INK};color:${INK};font-weight:800;font-size:13.5px;padding:11px 16px;border-radius:12px;display:flex;justify-content:space-between;animation:popIn .4s cubic-bezier(.34,1.56,.64,1) both;animation-delay:${i * 100}ms;">
                      <span>${chip.label}</span><span style="color:${primary};">${chip.xp}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            `}
          </div>

          <div class="exercise-footer" style="max-width:600px;margin:auto auto 0;padding:0 24px 28px;width:100%;">
            ${!feedbackShown ? `
              <div>
                ${!isComplete ? `
                  <button type="button" id="check-answer-btn" ${selectedId ? '' : 'disabled'} style="width:100%;padding:16px;border:2.5px solid ${!selectedId ? '#e4ddd0' : INK};border-radius:16px;background:${!selectedId ? '#eee6d9' : primary};box-shadow:${!selectedId ? 'none' : '5px 5px 0 ' + INK};color:${!selectedId ? '#b8b0a0' : '#fff'};font-family:Fredoka,sans-serif;font-weight:700;font-size:15px;cursor:${!selectedId ? 'not-allowed' : 'pointer'};transition:transform .1s ease,box-shadow .1s ease;">${!selectedId ? 'Select an answer' : 'Check answer'}</button>
                ` : `
                  <button id="finish-lesson-btn" style="width:100%;padding:16px;border:2.5px solid ${INK};border-radius:16px;background:${primary};box-shadow:5px 5px 0 ${INK};color:#fff;font-family:Fredoka,sans-serif;font-weight:700;font-size:15px;cursor:pointer;">Back to quest board</button>
                `}
              </div>
            ` : `
              <div role="status" aria-live="polite" style="max-width:520px;width:100%;background:${correct ? this._hexA(EMERALD, 0.14) : this._hexA(CORAL, 0.14)};border:2.5px solid ${INK};box-shadow:6px 6px 0 ${INK};border-radius:20px;padding:18px 20px;animation:cardUp .3s cubic-bezier(.22,1,.36,1);">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:6px;">
                  <span style="font-size:22px;">${correct ? '✓' : '💡'}</span>
                  <div style="font-family:'Fredoka',sans-serif;font-weight:700;font-size:17px;color:${INK};">${correct ? 'Nice work!' : 'Good try!'}</div>
                </div>
                <div style="font-size:13.5px;font-weight:700;color:${INK};line-height:1.5;margin-bottom:16px;">
                  ${correct ? 'The diagnosis is getting stronger.' : 'That answer gives us a useful signal.'}
                </div>
                <button id="continue-feedback-btn" style="width:100%;padding:14px;border:2.5px solid ${INK};border-radius:12px;background:${primary};box-shadow:3px 3px 0 ${INK};color:#fff;font-family:Fredoka,sans-serif;font-weight:700;font-size:13.5px;cursor:pointer;">Continue</button>
              </div>
            `}
          </div>
        </div>

        ${confettiPieces}
      </div>
    `;
  }

  renderTeacherOverview() {
    const INK = this.INK;
    return `
      <div class="teacher-page" style="font-family:'Inter',sans-serif;min-height:100vh;background-color:#f8fafc;padding:28px 24px;">
        <div style="max-width:1000px;margin:0 auto;">
          <div style="margin-bottom:28px;">
            <p style="color:#64748b;font-size:13px;margin:0 0 8px;">Teacher workspace · Class 8B</p>
            <h1 style="color:#0f1226;font-size:32px;margin:0 0 6px;font-family:Manrope;">See the gaps. Choose the action.</h1>
            <p style="color:#64748b;font-size:14px;margin:0;">A class-level view of the concepts your students are building right now.</p>
          </div>

          <div class="teacher-stats" style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px;">
            <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:18px;">
              <div style="font-size:13px;font-weight:700;color:#64748b;margin-bottom:8px;">Students active</div>
              <div style="font-size:28px;font-weight:700;color:#0f1226;">24</div>
              <div style="font-size:12px;color:#94a3b8;margin-top:4px;">↑ 3 this week</div>
            </div>
            <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:18px;">
              <div style="font-size:13px;font-weight:700;color:#64748b;margin-bottom:8px;">Need a nudge</div>
              <div style="font-size:28px;font-weight:700;color:#0f1226;">7</div>
              <div style="font-size:12px;color:#94a3b8;margin-top:4px;">students</div>
            </div>
            <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:18px;">
              <div style="font-size:13px;font-weight:700;color:#64748b;margin-bottom:8px;">Class mastery</div>
              <div style="font-size:28px;font-weight:700;color:#0f1226;">71%</div>
              <div style="font-size:12px;color:#94a3b8;margin-top:4px;">↑ 8%</div>
            </div>
            <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:18px;">
              <div style="font-size:13px;font-weight:700;color:#64748b;margin-bottom:8px;">Signals this week</div>
              <div style="font-size:28px;font-weight:700;color:#0f1226;">86</div>
              <div style="font-size:12px;color:#94a3b8;margin-top:4px;">high quality</div>
            </div>
          </div>

          <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:18px;margin-bottom:28px;">
            <h3 style="color:#0f1226;font-size:16px;font-weight:700;margin:0 0 12px;font-family:Manrope;">Learning clusters</h3>
            <p style="color:#64748b;font-size:13px;margin:0 0 16px;">Shared patterns, ready for a teacher decision.</p>
            <div class="teacher-clusters" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;">
              ${this.CLUSTER_DEFS.map(c => `
                <button class="teacher-cluster-btn" data-cluster-id="${c.id}" style="border:1px solid #e2e8f0;border-radius:10px;padding:14px;cursor:pointer;transition:all .2s;text-align:left;background:#fff;">
                  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
                    <span style="font-weight:700;font-size:12px;color:#2563eb;text-transform:uppercase;font-family:Inter;">${c.concept}</span>
                    <span style="background:#e0f2fe;color:#2563eb;padding:4px 8px;border-radius:6px;font-size:11px;font-weight:700;">${c.count}</span>
                  </div>
                  <div style="font-weight:700;font-size:13.5px;color:#0f1226;margin-bottom:6px;font-family:Manrope;">${c.title}</div>
                  <div style="font-size:12px;color:#64748b;line-height:1.4;font-family:Inter;">${c.evidence}</div>
                </button>
              `).join('')}
            </div>
          </div>

          <button id="logout-btn" style="padding:12px 24px;border:none;border-radius:8px;background:#2563eb;color:#fff;font-weight:700;cursor:pointer;font-family:Inter;">Log out</button>
        </div>
      </div>
    `;
  }

  renderTeacherCluster() {
    const INK = this.INK;
    const clusterData = this.CLUSTER_DEFS.find(cluster => cluster.id === this.state.selectedClusterId) || this.CLUSTER_DEFS[0];
    const selectedStudents = new Set(this.state.selectedStudentKeys);
    return `
      <div class="teacher-page" style="font-family:'Inter',sans-serif;min-height:100vh;background-color:#f8fafc;padding:28px 24px;">
        <div style="max-width:1000px;margin:0 auto;">
          <button id="back-to-overview-btn" style="background:none;border:none;color:#2563eb;font-weight:600;font-size:13px;cursor:pointer;margin-bottom:16px;font-family:Inter;">← Back to overview</button>

          <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:22px;margin-bottom:28px;">
            <div style="margin-bottom:12px;">
              <span style="font-weight:700;font-size:11.5px;color:#2563eb;text-transform:uppercase;font-family:Inter;">${clusterData.concept}</span>
            </div>
            <h2 style="color:#0f1226;font-size:20px;margin:0 0 6px;font-weight:700;font-family:Manrope;">${clusterData.title}</h2>
            <p style="color:#64748b;font-size:13px;margin:0;font-family:Inter;">${clusterData.count} students · ${clusterData.confidence} confidence</p>
          </div>

          <div class="teacher-detail-grid" style="display:grid;grid-template-columns:1.1fr 1fr;gap:16px;">
            <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:18px;display:flex;flex-direction:column;gap:12px;">
              <div style="font-weight:700;font-size:13.5px;color:#334155;margin-bottom:8px;font-family:Inter;">Students</div>
              ${this.STUDENTS.slice(0, 6).map((s, i) => `
                <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9;${i === 5 ? 'border-bottom:none;' : ''}">
                  <input type="checkbox" data-student-key="${s.key}" aria-label="Select ${s.name}" ${selectedStudents.has(s.key) ? 'checked' : ''} style="width:18px;height:18px;" />
                  <span style="font-weight:600;font-size:13px;color:#334155;flex:1;font-family:Inter;">${s.name}</span>
                </div>
              `).join('')}
            </div>

            <div style="background:#fff;border-radius:12px;border:1px solid #e2e8f0;padding:18px;display:flex;flex-direction:column;gap:14px;">
              <div>
                <label for="intervention-note" style="display:block;font-weight:700;font-size:13.5px;color:#334155;margin-bottom:8px;">Suggested intervention</label>
                <textarea id="intervention-note" aria-label="Suggested intervention" style="width:100%;min-height:100px;border:1px solid #dbe3f0;border-radius:8px;padding:10px;font-family:Inter;font-size:13px;color:#334155;resize:vertical;">${this.escapeHtml(this.state.teacherNote)}</textarea>
              </div>
              ${this.state.assignmentMessage ? `<div role="status" aria-live="polite" style="color:${this.state.assignmentMessage.startsWith('Select') ? '#b91c1c' : '#166534'};font-size:12.5px;font-weight:700;">${this.escapeHtml(this.state.assignmentMessage)}</div>` : ''}
              <button type="button" id="assign-intervention-btn" style="padding:12px 20px;border:none;border-radius:8px;background:#2563eb;color:#fff;font-weight:700;cursor:pointer;font-family:Inter;">Assign follow-up</button>
            </div>
          </div>

          <button id="logout-btn" style="margin-top:28px;padding:12px 24px;border:none;border-radius:8px;background:#2563eb;color:#fff;font-weight:700;cursor:pointer;font-family:Inter;">Log out</button>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Auth view
    document.getElementById('auth-login-btn')?.addEventListener('click', this.handleAuthLogin);
    document.getElementById('auth-signup-btn')?.addEventListener('click', this.handleAuthSignup);
    document.getElementById('auth-student-btn')?.addEventListener('click', this.handleAuthRoleStudent);
    document.getElementById('auth-teacher-btn')?.addEventListener('click', this.handleAuthRoleTeacher);
    document.getElementById('auth-form')?.addEventListener('submit', this.handleSubmitAuth);

    // General
    document.getElementById('logout-btn')?.addEventListener('click', this.handleLogout);

    // Student view
    document.querySelectorAll('[data-node-id]').forEach(node => {
      node.addEventListener('click', (e) => {
        this.handleNodeClick(e.currentTarget.dataset.nodeId);
      });
      node.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.handleNodeClick(e.currentTarget.dataset.nodeId);
        }
      });
    });

    document.getElementById('start-exercise-btn')?.addEventListener('click', this.handleStartExercise);
    document.getElementById('quit-exercise-btn')?.addEventListener('click', this.handleQuitExercise);
    document.getElementById('show-hint-btn')?.addEventListener('click', this.handleShowHint);
    document.getElementById('confidence-slider')?.addEventListener('input', (e) => {
      this.handleConfidenceChange(e.target.value);
    });

    document.querySelectorAll('.q1-option').forEach(btn => {
      btn.addEventListener('click', () => this.handleSelectQ1(btn.dataset.id));
    });

    document.querySelectorAll('.q2-option').forEach(btn => {
      btn.addEventListener('click', () => this.handleSelectQ2(btn.dataset.id));
    });

    document.getElementById('check-answer-btn')?.addEventListener('click', this.handleCheckAnswer);
    document.getElementById('continue-feedback-btn')?.addEventListener('click', this.handleContinueFeedback);
    document.getElementById('finish-lesson-btn')?.addEventListener('click', this.handleFinishLesson);

    // Popover
    document.getElementById('popover-backdrop')?.addEventListener('click', (e) => {
      if (e.target.id === 'popover-backdrop') this.handleClosePopover();
    });
    const questDialog = document.getElementById('quest-dialog');
    if (questDialog) {
      questDialog.focus();
      questDialog.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') this.handleClosePopover();
      });
    }
    document.getElementById('popover-start-btn')?.addEventListener('click', this.handleStartExercise);
    document.getElementById('popover-close-btn')?.addEventListener('click', this.handleClosePopover);

    // Graph
    const graphContainer = document.getElementById('graph-container');
    if (graphContainer) {
      graphContainer.addEventListener('mousemove', this.handleGraphMove);
      graphContainer.addEventListener('mouseleave', this.handleGraphLeave);
    }

    // Teacher view
    document.querySelectorAll('.teacher-cluster-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.handleTeacherCluster(btn.dataset.clusterId);
      });
    });

    document.querySelectorAll('[data-student-key]').forEach(input => {
      input.addEventListener('change', (e) => {
        this.handleTeacherStudentToggle(e.target.dataset.studentKey, e.target.checked);
      });
    });

    document.getElementById('back-to-overview-btn')?.addEventListener('click', this.handleBackToOverview);
    document.getElementById('assign-intervention-btn')?.addEventListener('click', this.handleAssignIntervention);
  }
}

// Initialize and render
const app = new LearnLoop();
app.render();
