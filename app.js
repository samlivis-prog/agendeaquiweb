(() => {
  "use strict";

  const STORAGE_KEY = "agendeAqui.appointments.v1";
  const DOCTORS_STORAGE_KEY = "agendeAqui.doctors.v1";
  const TOKEN_KEY = "agendeAquiweb.session.v1";
  const API_BASE_URL = (window.AGENDEAQUI_API_URL
    || (["localhost", "127.0.0.1"].includes(window.location.hostname) ? "http://localhost:3000" : ""))
    .replace(/\/+$/, "");
  const WHATSAPP_WINDOW_NAME = "agendeAquiWhatsApp";
  const form = document.getElementById("appointment-form");
  const list = document.getElementById("appointments-list");
  const emptyState = document.getElementById("empty-state");
  const emptyTitle = document.getElementById("empty-title");
  const emptyDescription = document.getElementById("empty-description");
  const toast = document.getElementById("toast");
  const todayLabel = document.getElementById("today-label");
  const searchInput = document.getElementById("search-input");
  const dateFilter = document.getElementById("date-filter");
  const statusFilter = document.getElementById("status-filter");
  const appointmentsPanel = document.getElementById("appointments-panel");
  const calendarPanel = document.getElementById("calendar-panel");
  const financialPanel = document.getElementById("financial-panel");
  const statsGrid = document.getElementById("stats-grid");
  const calendarDays = document.getElementById("calendar-days");
  const calendarMonthLabel = document.getElementById("calendar-month-label");
  const dayScheduleList = document.getElementById("day-schedule-list");
  const selectedDateTitle = document.getElementById("selected-date-title");
  const dayAppointmentCount = document.getElementById("day-appointment-count");
  const confirmationAlert = document.getElementById("confirmation-alert");
  const confirmationList = document.getElementById("confirmation-list");
  const appointmentDoctorInput = document.getElementById("appointment-doctor");
  const appointmentDoctorFilter = document.getElementById("appointment-doctor-filter");
  const calendarDoctorFilter = document.getElementById("calendar-doctor-filter");
  const scheduleHoursNote = document.getElementById("schedule-hours-note");
  const doctorForm = document.getElementById("doctor-form");
  const doctorWeeklySchedule = document.getElementById("doctor-weekly-schedule");
  const doctorInsuranceList = document.getElementById("doctor-insurances");
  const doctorProcedureList = document.getElementById("doctor-procedures");
  const doctorList = document.getElementById("doctor-list");
  const doctorsPanel = document.getElementById("doctors-panel");
  const shareDayAgendaLink = document.getElementById("share-day-agenda");
  const openWhatsappButton = document.getElementById("open-whatsapp");
  const pageTitle = document.getElementById("page-title");
  const pageSubtitle = document.getElementById("page-subtitle");
  const formTitle = document.getElementById("form-title");
  const saveButton = document.getElementById("save-button");
  const cancelEditButton = document.getElementById("cancel-edit");
  const appointmentFormDialog = document.getElementById("appointment-form-dialog");
  const appointmentSpecialtyInput = document.getElementById("appointment-specialty");
  const appointmentProcedureInput = document.getElementById("appointment-procedure");
  const appointmentFormError = document.getElementById("appointment-form-error");
  const dateInput = document.getElementById("appointment-date");
  const attendanceTypeInput = document.getElementById("attendance-type");
  const insuranceFields = document.getElementById("insurance-fields");
  const insuranceNameInput = document.getElementById("insurance-name");
  const insuranceReimbursementInput = document.getElementById("insurance-reimbursement");
  const detailsDialog = document.getElementById("appointment-dialog");
  const appointmentDetails = document.getElementById("appointment-details");
  const observationList = document.getElementById("observation-list");
  const observationForm = document.getElementById("observation-form");
  const newObservation = document.getElementById("new-observation");
  const paymentConfirmationForm = document.getElementById("payment-confirmation-form");
  const confirmationPaymentValue = document.getElementById("confirmation-payment-value");
  const confirmationPaymentMethod = document.getElementById("confirmation-payment-method");
  const financialDateFrom = document.getElementById("financial-date-from");
  const financialDateTo = document.getElementById("financial-date-to");
  const financialDoctorFilter = document.getElementById("financial-doctor-filter");
  const authScreen = document.getElementById("auth-screen");
  const appShell = document.getElementById("app-shell");
  const loginForm = document.getElementById("login-form");
  const loginEmail = document.getElementById("login-email");
  const loginPassword = document.getElementById("login-password");
  const authError = document.getElementById("auth-error");
  const loginButton = document.getElementById("login-button");
  const manageUsersButton = document.getElementById("manage-users-button");
  const userDialog = document.getElementById("user-dialog");
  const userForm = document.getElementById("user-form");
  let currentUserRole = "";
  let activeDetailsId = null;
  let activeView = "agenda";
  let whatsappWindow = null;
  let appointments = [];
  let doctors = [];
  let authToken = "";
  let syncing = false;
  let pendingSaves = 0;
  const cloudSnapshots = { doctors: [], appointments: [] };
  let toastTimer;
  const today = new Date();
  let calendarMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  let selectedCalendarDate = localDateKey(today);

  const fieldIds = [
    "patient-name", "patient-phone", "patient-email", "appointment-reason", "appointment-doctor",
    "appointment-date", "appointment-time", "appointment-type", "appointment-status",
    "appointment-value", "payment-method", "payment-status", "appointment-notes"
  ];
  let selectedAppointmentDoctorId = "";
  let selectedCalendarDoctorId = "";

  function localDateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  async function apiRequest(path, options = {}) {
    if (!API_BASE_URL) throw new Error("Configure a URL da API no arquivo config.js.");
    const headers = new Headers(options.headers || {});
    headers.set("Content-Type", "application/json");
    if (authToken) headers.set("Authorization", `Bearer ${authToken}`);
    const response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
    const payload = await response.json();
    if (response.status === 401 && authToken) {
      authToken = "";
      sessionStorage.removeItem(TOKEN_KEY);
      showLogin("Sua sessão expirou. Entre novamente.");
    }
    if (!response.ok) throw new Error(payload.error || "A API não conseguiu concluir a operação.");
    return payload;
  }

  function showLogin(message = "") {
    authScreen.hidden = false;
    appShell.hidden = true;
    authError.textContent = message || (API_BASE_URL ? "" : "Configure a URL da API publicada em config.js.");
    authError.hidden = !authError.textContent;
  }

  function copyRecords(records) {
    return records.map((record) => ({ ...record }));
  }

  function recordSignature(value) {
    if (Array.isArray(value)) return `[${value.map(recordSignature).join(",")}]`;
    if (value && typeof value === "object") {
      return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${recordSignature(value[key])}`).join(",")}}`;
    }
    return JSON.stringify(value);
  }

  async function persistCollection(kind, records) {
    const previous = cloudSnapshots[kind];
    const previousById = new Map(previous.map((record) => [record.id, record]));
    const nextById = new Map(records.map((record) => [record.id, record]));
    const upserts = records.filter((record) => recordSignature(previousById.get(record.id)) !== recordSignature(record));
    const deletedIds = previous.filter((record) => !nextById.has(record.id)).map((record) => record.id);
    if (!upserts.length && !deletedIds.length) return true;

    pendingSaves += 1;
    try {
      await apiRequest(`/api/records/${kind}/sync`, {
        method: "POST",
        body: JSON.stringify({ upserts, deletedIds })
      });
      cloudSnapshots[kind] = copyRecords(records);
      return true;
    } catch (error) {
      console.error(`Não foi possível sincronizar ${kind} com a nuvem.`, error);
      showToast(error.message);
      return false;
    } finally {
      pendingSaves -= 1;
    }
  }

  function saveDoctors() {
    return persistCollection("doctors", doctors);
  }

  function saveAppointments() {
    return persistCollection("appointments", appointments);
  }

  function readLegacyRecords(key) {
    try {
      const value = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(value) ? value.filter((record) => record && typeof record.id === "string") : [];
    } catch (error) {
      console.error(`Não foi possível ler os dados locais para migração (${key}).`, error);
      showToast("Não foi possível ler os dados antigos deste navegador para a migração.");
      return [];
    }
  }

  async function loadCloudState() {
    const state = await apiRequest("/api/state");
    appointments = Array.isArray(state.appointments) ? state.appointments : [];
    doctors = Array.isArray(state.doctors) ? state.doctors : [];
    cloudSnapshots.appointments = copyRecords(appointments);
    cloudSnapshots.doctors = copyRecords(doctors);

    if (!appointments.length && !doctors.length) {
      const legacyDoctors = readLegacyRecords(DOCTORS_STORAGE_KEY);
      const legacyAppointments = readLegacyRecords(STORAGE_KEY);
      if ((legacyDoctors.length || legacyAppointments.length)
        && window.confirm(`Encontramos ${legacyDoctors.length} médico(s) e ${legacyAppointments.length} consulta(s) salvos apenas neste navegador. Deseja importá-los para a nuvem?`)) {
        doctors = legacyDoctors;
        appointments = legacyAppointments;
        if (!(await saveDoctors()) || !(await saveAppointments())) {
          doctors = [];
          appointments = [];
          cloudSnapshots.doctors = [];
          cloudSnapshots.appointments = [];
          throw new Error("A migração dos dados locais não foi concluída.");
        }
      }
    }
    render();
    authScreen.hidden = true;
    appShell.hidden = false;
    manageUsersButton.hidden = currentUserRole !== "owner";
  }

  async function initializeCloudSession() {
    authToken = sessionStorage.getItem(TOKEN_KEY) || "";
    if (!authToken) {
      showLogin();
      return;
    }
    try {
      const session = await apiRequest("/api/auth/me");
      currentUserRole = session.user.role;
      await loadCloudState();
    } catch (error) {
      console.error("Não foi possível iniciar a sessão do AgendeAqui.", error);
      authToken = "";
      sessionStorage.removeItem(TOKEN_KEY);
      showLogin(error.message);
    }
  }

  async function refreshCloudState() {
    if (!authToken || pendingSaves || syncing || detailsDialog.open
      || appointmentFormDialog.open || document.getElementById("doctor-id").value) return;
    syncing = true;
    try {
      const state = await apiRequest("/api/state");
      appointments = Array.isArray(state.appointments) ? state.appointments : [];
      doctors = Array.isArray(state.doctors) ? state.doctors : [];
      cloudSnapshots.appointments = copyRecords(appointments);
      cloudSnapshots.doctors = copyRecords(doctors);
      render();
    } catch (error) {
      console.error("Não foi possível atualizar os dados da nuvem.", error);
    } finally {
      syncing = false;
    }
  }

  function normalizeBrazilPhone(value) {
    let digits = String(value || "").replace(/\D/g, "");
    if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
    return /^55\d{10,11}$/.test(digits) ? digits : "";
  }

  function whatsappUrl(message, phone = "") {
    const normalizedPhone = phone ? normalizeBrazilPhone(phone) : "";
    const query = new URLSearchParams();
    if (normalizedPhone) query.set("phone", normalizedPhone);
    query.set("text", message);
    return `https://web.whatsapp.com/send?${query.toString()}`;
  }

  function openWhatsAppInNamedTab(url) {
    if (whatsappWindow) {
      try {
        whatsappWindow.location.href = url;
        whatsappWindow.focus();
        return true;
      } catch (error) {
        console.warn("Não foi possível reutilizar a aba aberta do WhatsApp; tentando pelo nome da janela.", error);
      }
    }

    whatsappWindow = window.open(url, WHATSAPP_WINDOW_NAME);
    if (!whatsappWindow) {
      showToast("O navegador bloqueou a abertura do WhatsApp. Permita pop-ups para este sistema e tente novamente.");
      return false;
    }
    whatsappWindow.focus();
    openWhatsappButton.classList.add("is-open");
    openWhatsappButton.innerHTML = "<span aria-hidden=\"true\">✓</span> WhatsApp Web aberto";
    return true;
  }

  function initializeWhatsApp() {
    openWhatsAppInNamedTab("https://web.whatsapp.com/");
  }

  function getTomorrowKey() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return localDateKey(tomorrow);
  }

  function exportSystemData() {
    const payload = {
      format: "agendeAqui-export",
      version: 1,
      exportedAt: new Date().toISOString(),
      doctors,
      appointments
    };
    const file = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `agendeAqui-dados-${localDateKey(new Date())}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast("Arquivo JSON com médicos e consultas exportado.");
  }

  function showToast(message) {
    if (appointmentFormDialog.open) {
      appointmentFormError.textContent = message;
      appointmentFormError.hidden = false;
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => { appointmentFormError.hidden = true; }, 5000);
      return;
    }
    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 3200);
  }

  function formatDate(value) {
    if (!value) return "";
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  }

  function formatCurrency(value) {
    const amount = Number(value);
    return Number.isFinite(amount) ? amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "R$ 0,00";
  }

  function formatTimestamp(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? "Data não informada"
      : date.toLocaleString("pt-BR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  }

  function dateFromKey(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function formatLongDate(value) {
    const formatted = dateFromKey(value).toLocaleDateString("pt-BR", {
      weekday: "long", day: "numeric", month: "long", year: "numeric"
    });
    return formatted.charAt(0).toLocaleUpperCase("pt-BR") + formatted.slice(1);
  }

  function initials(name) {
    return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] || "").join("");
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
  }

  function findDoctor(id) {
    return doctors.find((doctor) => doctor.id === id) || null;
  }

  function appointmentDoctor(appointment) {
    return findDoctor(appointment.doctorId)
      || doctors.find((doctor) => doctor.name.toLocaleLowerCase("pt-BR") === (appointment.doctorName || "").toLocaleLowerCase("pt-BR"))
      || null;
  }

  function appointmentBelongsToDoctor(appointment, doctor) {
    return Boolean(doctor && (
      appointment.doctorId === doctor.id
      || (!appointment.doctorId && appointment.doctorName
        && appointment.doctorName.toLocaleLowerCase("pt-BR") === doctor.name.toLocaleLowerCase("pt-BR"))
    ));
  }

  function doctorWorkingPeriods(doctor, dayIndex = null) {
    if (!doctor) return [];
    const hasWeeklySchedule = Object.keys(doctor.workingDays || {}).length > 0;
    const daySchedules = (dayIndex === null ? Object.keys(doctor.workingDays || {}) : [String(dayIndex)])
      .map((day) => doctor.workingDays?.[day])
      .filter(Boolean);
    if (!daySchedules.length && !hasWeeklySchedule && doctor.workingHours) {
      const legacyDays = (doctor.serviceDays || []).map(String);
      if (dayIndex === null || legacyDays.includes(String(dayIndex))) daySchedules.push(doctor.workingHours);
    }
    const periodValues = daySchedules.flatMap((hours) => {
      const periods = [[hours.morningStart, hours.morningEnd]];
      if (hours.afternoonStart && hours.afternoonEnd) periods.push([hours.afternoonStart, hours.afternoonEnd]);
      return periods;
    }).map(([start, end]) => ({ start: timeToMinutes(start), end: timeToMinutes(end) }))
      .filter((period) => period.start >= 0 && period.end > period.start);
    return [...new Map(periodValues.map((period) => [`${period.start}-${period.end}`, period])).values()]
      .sort((first, second) => first.start - second.start);
  }

  function doctorHoursLabel(doctor) {
    return doctorWorkingPeriods(doctor).map((period) => (
      `${String(Math.floor(period.start / 60)).padStart(2, "0")}:${String(period.start % 60).padStart(2, "0")}–${String(Math.floor(period.end / 60)).padStart(2, "0")}:${String(period.end % 60).padStart(2, "0")}`
    )).join(" e ");
  }

  function doctorDaysLabel(doctor) {
    const names = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const days = Object.keys(doctor.workingDays || {}).length
      ? Object.keys(doctor.workingDays)
      : (doctor.serviceDays || []).map(String);
    return days.map(Number).sort((first, second) => (first + 6) % 7 - (second + 6) % 7).map((day) => names[day]).join(", ");
  }

  function doctorDayPeriods(doctor, dateKey) {
    return doctorWorkingPeriods(doctor, dateFromKey(dateKey).getDay());
  }

  function doctorInsurances(doctor) {
    return Array.isArray(doctor?.insurances) ? doctor.insurances : [];
  }

  function doctorInsurance(doctor, name) {
    return doctorInsurances(doctor).find((insurance) => insurance.name === name) || null;
  }

  function renderDoctorWeeklySchedule(workingDays = {}) {
    const dayNames = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    doctorWeeklySchedule.innerHTML = dayNames.map((name, day) => {
      const hours = workingDays[day] || {};
      const enabled = Boolean(workingDays[day]);
      const disabled = enabled ? "" : " disabled";
      const field = (period, label, fallback) => `<label class="field"><span>${label}</span><input type="time" id="doctor-day-${day}-${period}" value="${escapeHTML(hours[period] || fallback)}"${disabled}></label>`;
      return `<div class="doctor-day-row" data-day-row="${day}">
        <label class="doctor-day-toggle"><input type="checkbox" data-day-enabled="${day}"${enabled ? " checked" : ""}><span>${name}</span></label>
        ${field("morningStart", "Início 1º período", "08:00")}
        ${field("morningEnd", "Fim 1º período", "12:00")}
        ${field("afternoonStart", "Início 2º período", "")}
        ${field("afternoonEnd", "Fim 2º período", "")}
      </div>`;
    }).join("");
  }

  function addDoctorInsuranceRow(insurance = {}) {
    const row = document.createElement("div");
    row.className = "doctor-insurance-row";
    row.innerHTML = `<label class="field"><span>Nome do convênio</span><input type="text" data-insurance-name maxlength="100" placeholder="Ex.: Unimed" value="${escapeHTML(insurance.name || "")}"></label>
      <label class="field"><span>Valor de repasse</span><div class="input-prefix"><span>R$</span><input type="number" data-insurance-value min="0" step="0.01" inputmode="decimal" placeholder="0,00" value="${escapeHTML(insurance.reimbursement || "")}"></div></label>
      <button class="icon-button delete" type="button" data-remove-insurance aria-label="Remover convênio">×</button>`;
    doctorInsuranceList.append(row);
  }

  function doctorProcedures(doctor) {
    return Array.isArray(doctor?.procedures) ? doctor.procedures : [];
  }

  function addDoctorProcedureRow(procedure = {}) {
    const row = document.createElement("div");
    row.className = "doctor-procedure-row";
    row.innerHTML = `<label class="field"><span>Nome do procedimento</span><input type="text" data-procedure-name maxlength="100" placeholder="Ex.: Ultrassom" value="${escapeHTML(procedure.name || "")}"></label>
      <label class="field"><span>Valor</span><div class="input-prefix"><span>R$</span><input type="number" data-procedure-value min="0" step="0.01" inputmode="decimal" placeholder="0,00" value="${escapeHTML(procedure.value || "")}"></div></label>
      <button class="icon-button delete" type="button" data-remove-procedure aria-label="Remover procedimento">×</button>`;
    doctorProcedureList.append(row);
  }

  function updateAppointmentProcedures(selectedName = appointmentProcedureInput.value) {
    const doctor = findDoctor(appointmentDoctorInput.value);
    const procedures = doctorProcedures(doctor);
    const legacy = selectedName && !procedures.some((procedure) => procedure.name === selectedName)
      ? `<option value="${escapeHTML(selectedName)}">${escapeHTML(selectedName)} (consulta existente)</option>`
      : "";
    appointmentProcedureInput.innerHTML = `<option value="">${procedures.length ? "Selecione um procedimento (opcional)" : "Nenhum procedimento cadastrado"}</option>${legacy}${procedures.map((procedure) => `<option value="${escapeHTML(procedure.name)}">${escapeHTML(procedure.name)} · ${escapeHTML(formatCurrency(procedure.value))}</option>`).join("")}`;
    appointmentProcedureInput.value = selectedName && (procedures.some((procedure) => procedure.name === selectedName) || legacy)
      ? selectedName
      : "";
  }

  function renderDoctorList() {
    document.getElementById("doctor-count").textContent = `${doctors.length} ${doctors.length === 1 ? "médico" : "médicos"}`;
    doctorList.innerHTML = doctors.length
      ? doctors.slice().sort((first, second) => first.name.localeCompare(second.name, "pt-BR")).map((doctor) => `<article class="doctor-list-item">
          <div class="doctor-list-info">
            <strong>${escapeHTML(doctor.name)}</strong>
            <span>${escapeHTML(doctor.specialty || "Especialidade não informada")}</span>
            <small>${escapeHTML(doctor.cellphone || "Celular não informado")} · ${escapeHTML(doctorDaysLabel(doctor) || "Sem dias configurados")}</small>
          </div>
          <div class="doctor-list-actions">
            <button class="button button-outline" type="button" data-edit-doctor="${escapeHTML(doctor.id)}">Editar</button>
            <button class="button button-outline doctor-delete-button" type="button" data-delete-doctor="${escapeHTML(doctor.id)}">Excluir</button>
          </div>
        </article>`).join("")
      : '<p class="doctor-list-empty">Nenhum médico cadastrado ainda.</p>';
  }

  function appointmentDuration(appointment, doctor) {
    const duration = appointment.type === "Retorno" ? doctor.returnDuration : doctor.firstDuration;
    const minutes = Number(duration);
    return Number.isFinite(minutes) && minutes > 0 ? minutes : 30;
  }

  function renderDoctorOptions() {
    const selectedAppointmentId = appointmentDoctorInput.value || selectedAppointmentDoctorId;
    const selectedFilterId = appointmentDoctorFilter.value || "all";
    const selectedFinancialDoctorId = financialDoctorFilter.value || "all";
    const selectedCalendarId = calendarDoctorFilter.value || selectedCalendarDoctorId;
    const options = doctors.slice().sort((first, second) => first.name.localeCompare(second.name, "pt-BR"))
      .map((doctor) => `<option value="${escapeHTML(doctor.id)}">${escapeHTML(doctor.name)} · ${escapeHTML(doctor.specialty)}</option>`)
      .join("");

    appointmentDoctorInput.innerHTML = `<option value="">${doctors.length ? "Selecione um médico" : "Cadastre um médico para agendar"}</option>${options}`;
    appointmentDoctorInput.value = doctors.some((doctor) => doctor.id === selectedAppointmentId) ? selectedAppointmentId : "";
    appointmentDoctorInput.disabled = doctors.length === 0;
    appointmentSpecialtyInput.value = findDoctor(appointmentDoctorInput.value)?.specialty || "";

    appointmentDoctorFilter.innerHTML = `<option value="all">Todos os médicos</option>${options}`;
    appointmentDoctorFilter.value = doctors.some((doctor) => doctor.id === selectedFilterId) ? selectedFilterId : "all";

    financialDoctorFilter.innerHTML = `<option value="all">Todos os médicos</option>${options}`;
    financialDoctorFilter.value = doctors.some((doctor) => doctor.id === selectedFinancialDoctorId) ? selectedFinancialDoctorId : "all";

    calendarDoctorFilter.innerHTML = doctors.length
      ? options
      : '<option value="">Cadastre um médico para ver a agenda</option>';
    selectedCalendarDoctorId = doctors.some((doctor) => doctor.id === selectedCalendarId)
      ? selectedCalendarId
      : (doctors[0] ? doctors[0].id : "");
    calendarDoctorFilter.value = selectedCalendarDoctorId;
    calendarDoctorFilter.disabled = doctors.length === 0;
  }

  function isActive(appointment) {
    return appointment.status !== "Cancelada";
  }

  function getFilteredAppointments() {
    const query = searchInput.value.trim().toLocaleLowerCase("pt-BR");
    const dateMode = dateFilter.value;
    const selectedStatus = statusFilter.value;
    const selectedDoctorId = appointmentDoctorFilter.value;
    const today = localDateKey(new Date());

    return appointments.filter((appointment) => {
      const matchesQuery = !query
        || appointment.patientName.toLocaleLowerCase("pt-BR").includes(query)
        || appointment.patientPhone.toLocaleLowerCase("pt-BR").includes(query);
      const matchesStatus = selectedStatus === "all" || appointment.status === selectedStatus;
      const matchesDoctor = selectedDoctorId === "all"
        || appointmentBelongsToDoctor(appointment, findDoctor(selectedDoctorId));
      const matchesDate = dateMode === "all"
        || (dateMode === "today" && appointment.date === today)
        || (dateMode === "upcoming" && appointment.date >= today && appointment.status !== "Cancelada")
        || (dateMode === "past" && appointment.date < today);
      return matchesQuery && matchesStatus && matchesDate && matchesDoctor;
    }).sort((first, second) => `${first.date}T${first.time}`.localeCompare(`${second.date}T${second.time}`));
  }

  function statusClass(status) {
    return {
      "Agendada": "status-agendada",
      "Confirmada": "status-confirmada",
      "Concluída": "status-concluida",
      "Cancelada": "status-cancelada"
    }[status] || "status-agendada";
  }

  function renderRow(appointment) {
    const paymentLine = [appointment.paymentMethod, appointment.paymentStatus].filter(Boolean).join(" · ") || "A definir";
    const paymentValue = appointment.paymentStatus === "Pago"
      ? (appointment.paidValue ?? appointment.value)
      : appointment.value;
    return `<tr class="appointment-row" data-id="${escapeHTML(appointment.id)}" tabindex="0" title="Clique para ver os detalhes">
      <td><div class="patient-cell"><span class="patient-avatar">${escapeHTML(initials(appointment.patientName))}</span><span><strong class="patient-name">${escapeHTML(appointment.patientName)}</strong><small class="patient-phone">${escapeHTML(appointment.patientPhone)}</small></span></div></td>
      <td><span class="date-cell"><strong>${escapeHTML(formatDate(appointment.date))}</strong><span>${escapeHTML(appointment.time)}</span></span></td>
      <td>${escapeHTML(appointmentDoctor(appointment)?.name || appointment.doctorName || "—")}</td>
      <td><span class="type-label">${escapeHTML(appointment.type)}</span></td>
      <td><span class="payment-cell"><strong>${escapeHTML(formatCurrency(paymentValue))}</strong><span>${escapeHTML(paymentLine)}</span></span></td>
      <td><span class="status-badge ${statusClass(appointment.status)}">${escapeHTML(appointment.status)}</span></td>
      <td><div class="row-actions"><button class="icon-button" type="button" data-action="edit" data-id="${escapeHTML(appointment.id)}" aria-label="Editar consulta de ${escapeHTML(appointment.patientName)}" title="Editar">✎</button><button class="icon-button delete" type="button" data-action="delete" data-id="${escapeHTML(appointment.id)}" aria-label="Excluir consulta de ${escapeHTML(appointment.patientName)}" title="Excluir">×</button></div></td>
    </tr>`;
  }

  function renderStats() {
    const today = localDateKey(new Date());
    const tomorrow = getTomorrowKey();
    const todaysAppointments = appointments.filter((appointment) => appointment.date === today && isActive(appointment));
    const upcoming = appointments.filter((appointment) => appointment.date >= today && isActive(appointment));
    const pending = appointments.filter((appointment) => appointment.date === tomorrow && appointment.status === "Agendada");

    document.getElementById("stat-today").textContent = todaysAppointments.length;
    document.getElementById("stat-upcoming").textContent = upcoming.length;
    document.getElementById("stat-pending").textContent = pending.length;
  }

  function renderFinancialData() {
    const from = financialDateFrom.value;
    const to = financialDateTo.value;
    const selectedDoctorId = financialDoctorFilter.value;
    const matchesDoctor = (appointment) => selectedDoctorId === "all"
      || appointmentBelongsToDoctor(appointment, findDoctor(selectedDoctorId));
    const inRange = (date) => (!from || date >= from) && (!to || date <= to);
    const paymentDate = (appointment) => appointment.paidAt
      ? localDateKey(new Date(appointment.paidAt))
      : appointment.date;
    const paid = appointments.filter((appointment) => appointment.paymentStatus === "Pago"
      && matchesDoctor(appointment) && inRange(paymentDate(appointment)));
    const pending = appointments.filter((appointment) => appointment.paymentStatus === "Pendente"
      && appointment.status !== "Cancelada" && matchesDoctor(appointment) && inRange(appointment.date));
    const receivedTotal = paid.reduce((sum, appointment) => sum + (Number(appointment.paidValue ?? appointment.value) || 0), 0);
    const pendingTotal = pending.reduce((sum, appointment) => {
      const expected = appointment.attendanceType === "Convênio"
        ? (appointment.insuranceReimbursement || appointment.value)
        : appointment.value;
      return sum + (Number(expected) || 0);
    }, 0);
    const payments = paid.slice().sort((first, second) => (
      paymentDate(second).localeCompare(paymentDate(first))
    ));
    const now = new Date();
    const monthStart = localDateKey(new Date(now.getFullYear(), now.getMonth(), 1));
    const monthEnd = localDateKey(new Date(now.getFullYear(), now.getMonth() + 1, 0));
    const yearStart = `${now.getFullYear()}-01-01`;
    const yearEnd = `${now.getFullYear()}-12-31`;
    const expectedRevenue = (start, end) => appointments
      .filter((appointment) => appointment.status !== "Cancelada"
        && matchesDoctor(appointment) && appointment.date >= start && appointment.date <= end)
      .reduce((sum, appointment) => {
        const expected = appointment.attendanceType === "Convênio"
          ? (appointment.insuranceReimbursement || appointment.value)
          : appointment.value;
        return sum + (Number(expected) || 0);
      }, 0);

    document.getElementById("financial-received").textContent = formatCurrency(receivedTotal);
    document.getElementById("financial-pending").textContent = formatCurrency(pendingTotal);
    document.getElementById("financial-month-revenue").textContent = formatCurrency(expectedRevenue(monthStart, monthEnd));
    document.getElementById("financial-year-revenue").textContent = formatCurrency(expectedRevenue(yearStart, yearEnd));
    document.getElementById("financial-payments-list").innerHTML = payments.map((appointment) => {
      return `<tr><td>${escapeHTML(formatDate(paymentDate(appointment)))}</td><td>${escapeHTML(appointment.patientName)}</td><td>${escapeHTML(appointmentDoctor(appointment)?.name || appointment.doctorName || "—")}</td><td>${escapeHTML(appointment.paymentMethod || "Não informado")}</td><td>${escapeHTML(formatCurrency(appointment.paidValue ?? appointment.value))}</td></tr>`;
    }).join("");
    document.getElementById("financial-empty-state").classList.toggle("is-visible", payments.length === 0);
    document.getElementById("financial-empty-state").querySelector("strong").textContent =
      payments.length ? "" : "Nenhum pagamento registrado";
    renderDailyFlow(payments, from, to, now);
  }

  function renderDailyFlow(payments, from, to, now) {
    const chart = document.getElementById("daily-flow-chart");
    const grouped = new Map();
    payments.forEach((appointment) => {
      const day = appointment.paidAt ? localDateKey(new Date(appointment.paidAt)) : appointment.date;
      grouped.set(day, (grouped.get(day) || 0) + (Number(appointment.paidValue ?? appointment.value) || 0));
    });
    const end = to || (from && from > localDateKey(now) ? from : localDateKey(now));
    const start = from || localDateKey(new Date(now.getFullYear(), now.getMonth(), 1));
    const rangeStart = dateFromKey(start);
    const rangeEnd = dateFromKey(end);
    const dateKeys = [];
    if (rangeStart <= rangeEnd) {
      const visibleStart = new Date(rangeEnd);
      visibleStart.setDate(visibleStart.getDate() - 30);
      const cursor = rangeStart < visibleStart ? visibleStart : rangeStart;
      for (const date = new Date(cursor); date <= rangeEnd; date.setDate(date.getDate() + 1)) {
        dateKeys.push(localDateKey(date));
      }
    }
    const max = Math.max(0, ...dateKeys.map((date) => grouped.get(date) || 0));
    chart.innerHTML = dateKeys.length
      ? dateKeys.map((date) => {
        const amount = grouped.get(date) || 0;
        const height = max ? Math.max(amount ? 4 : 0, amount / max * 100) : 0;
        return `<div class="daily-flow-column" title="${escapeHTML(formatDate(date))}: ${escapeHTML(formatCurrency(amount))}"><span class="daily-flow-value">${amount ? escapeHTML(formatCurrency(amount)) : ""}</span><span class="daily-flow-bar" style="height:${height}%"></span><span class="daily-flow-date">${escapeHTML(date.slice(8, 10))}</span></div>`;
      }).join("")
      : '<p class="daily-flow-empty">Selecione um período válido para visualizar os recebimentos.</p>';
  }

  async function confirmAppointment(id) {
    const index = appointments.findIndex((appointment) => appointment.id === id);
    if (index < 0) {
      showToast("Esta consulta não foi encontrada.");
      return;
    }
    const appointment = appointments[index];
    if (appointment.status !== "Agendada") return;
    const previous = appointments;
    appointments = appointments.map((item, itemIndex) => itemIndex === index
      ? { ...item, status: "Confirmada", confirmedAt: new Date().toISOString() }
      : item);
    if (!(await saveAppointments())) {
      appointments = previous;
      return;
    }
    render();
    showToast(`Consulta de ${appointment.patientName} confirmada.`);
  }

  function renderConfirmations() {
    const tomorrow = getTomorrowKey();
    const pending = appointments
      .filter((appointment) => appointment.date === tomorrow && appointment.status === "Agendada")
      .sort((first, second) => (first.time || "").localeCompare(second.time || ""));

    confirmationAlert.hidden = pending.length === 0 || activeView !== "agenda";
    document.getElementById("confirmation-alert-card").hidden = activeView !== "agenda";
    document.getElementById("confirmation-alert-card").disabled = pending.length === 0;
    document.getElementById("confirmation-alert-count").textContent = `${pending.length} ${pending.length === 1 ? "consulta" : "consultas"}`;
    document.getElementById("confirmation-alert-description").textContent =
      `Consultas de ${formatLongDate(tomorrow)} que ainda aguardam confirmação.`;
    confirmationList.innerHTML = pending.map((appointment) => {
      const whatsapp = normalizeBrazilPhone(appointment.patientPhone);
      const doctorName = appointmentDoctor(appointment)?.name || appointment.doctorName;
      const doctorLine = doctorName
        ? `Gostaríamos de confirmar sua consulta com Dr(a). ${doctorName}, marcada para amanhã, ${formatLongDate(appointment.date)}, às ${appointment.time}.`
        : `Gostaríamos de confirmar sua consulta de amanhã, ${formatLongDate(appointment.date)}, às ${appointment.time}.`;
      const message = `Olá, ${appointment.patientName}! Tudo bem? ${doctorLine} Você poderia confirmar sua presença respondendo a esta mensagem?`;
      const action = whatsapp
        ? `<a class="button button-whatsapp" href="${escapeHTML(whatsappUrl(message, whatsapp))}" target="${WHATSAPP_WINDOW_NAME}" aria-label="Solicitar confirmação de ${escapeHTML(appointment.patientName)} pelo WhatsApp"><span aria-hidden="true">↗</span> Pedir confirmação</a>`
        : `<span class="whatsapp-unavailable">Telefone ausente ou inválido</span>`;
      return `<article class="confirmation-item">
        <span class="confirmation-time">${escapeHTML(appointment.time)}</span>
        <span class="confirmation-patient"><strong>${escapeHTML(appointment.patientName)}</strong><small>${escapeHTML(appointment.patientPhone || "Sem telefone")} · ${escapeHTML(appointment.reason || appointment.type)}</small></span>
        <div class="confirmation-actions">${action}<button class="button button-confirm-appointment" type="button" data-confirm-appointment="${escapeHTML(appointment.id)}" aria-label="Confirmar consulta de ${escapeHTML(appointment.patientName)}">✓ Confirmar consulta</button></div>
      </article>`;
    }).join("");
  }

  function render() {
    const filtered = getFilteredAppointments();
    list.innerHTML = filtered.map(renderRow).join("");
    document.getElementById("result-count").textContent = `${filtered.length} ${filtered.length === 1 ? "consulta" : "consultas"}`;
    emptyState.classList.toggle("is-visible", filtered.length === 0);
    if (appointments.length === 0) {
      emptyTitle.textContent = "Sua agenda começa aqui";
      emptyDescription.textContent = "Cadastre a primeira consulta para organizar os horários do consultório.";
    } else {
      emptyTitle.textContent = "Nenhuma consulta encontrada";
      emptyDescription.textContent = "Tente alterar a busca ou os filtros para ver outros agendamentos.";
    }
    renderStats();
    renderConfirmations();
    renderDoctorOptions();
    renderDoctorList();
    renderCalendar();
    renderFinancialData();
  }

  function setActiveView(view) {
    activeView = view;
    const isCalendar = view === "calendar";
    const isDoctors = view === "doctors";
    const isFinancial = view === "financial";
    appointmentsPanel.hidden = isCalendar || isDoctors || isFinancial;
    calendarPanel.hidden = !isCalendar;
    doctorsPanel.hidden = !isDoctors;
    financialPanel.hidden = !isFinancial;
    statsGrid.hidden = view !== "agenda";
    pageTitle.textContent = isCalendar ? "Minha Agenda" : isDoctors ? "Médicos" : isFinancial ? "Dados financeiros" : "Agenda de consultas";
    pageSubtitle.textContent = isCalendar
      ? "Visualize separadamente a agenda e os horários de cada médico."
      : isDoctors
        ? "Cadastre os profissionais e configure os horários do consultório."
        : isFinancial
          ? "Acompanhe valores recebidos e pagamentos pendentes."
          : "Cadastre e acompanhe os agendamentos do consultório.";
    document.querySelectorAll("[data-view]").forEach((link) => {
      const active = link.dataset.view === view;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    if (isCalendar) renderCalendar();
    if (isFinancial) renderFinancialData();
    renderConfirmations();
  }

  function getDoctorSlots(doctor, dayIndex) {
    const slots = [];
    const duration = Number(doctor.firstDuration) || 30;
    for (const period of doctorWorkingPeriods(doctor, dayIndex)) {
      for (let minute = period.start; minute + duration <= period.end; minute += duration) {
        slots.push({
          start: minute,
          end: minute + duration,
          time: `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`
        });
      }
    }
    return slots;
  }

  function timeToMinutes(value) {
    const [hour, minute] = (value || "").split(":").map(Number);
    return Number.isFinite(hour) && Number.isFinite(minute) ? hour * 60 + minute : -1;
  }

  function statusSymbol(status) {
    return {
      "Agendada": "◷",
      "Confirmada": "✓",
      "Concluída": "●",
      "Cancelada": "×"
    }[status] || "◷";
  }

  function appointmentDateLabel(value) {
    return `${formatLongDate(value)}${value === localDateKey(new Date()) ? " (hoje)" : ""}`;
  }

  function renderCalendar() {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const monthLabel = calendarMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    calendarMonthLabel.textContent = monthLabel.charAt(0).toLocaleUpperCase("pt-BR") + monthLabel.slice(1);

    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const mondayOffset = (firstDay.getDay() + 6) % 7;
    const cells = [];

    for (let index = 0; index < mondayOffset; index += 1) {
      cells.push('<span class="calendar-empty-day" aria-hidden="true"></span>');
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const dateKey = localDateKey(new Date(year, month, day));
      const doctor = findDoctor(selectedCalendarDoctorId);
      const dayAppointments = appointments
        .filter((appointment) => appointment.date === dateKey && appointmentBelongsToDoctor(appointment, doctor))
        .sort((first, second) => (first.time || "").localeCompare(second.time || ""));
      const statuses = [...new Set(dayAppointments.map((appointment) => appointment.status))];
      const markers = statuses.map((status) => `<span class="calendar-day-marker ${statusClass(status)}" aria-hidden="true">${statusSymbol(status)}</span>`).join("");
      const todayClass = dateKey === localDateKey(new Date()) ? " is-today" : "";
      const selectedClass = dateKey === selectedCalendarDate ? " is-selected" : "";
      const appointmentCount = dayAppointments.length ? `<span class="calendar-day-count">${dayAppointments.length}</span>` : "";
      cells.push(`<button class="calendar-day${todayClass}${selectedClass}" type="button" data-date="${dateKey}" aria-label="${escapeHTML(appointmentDateLabel(dateKey))}, ${dayAppointments.length} ${dayAppointments.length === 1 ? "consulta" : "consultas"}" aria-pressed="${dateKey === selectedCalendarDate}"><span class="calendar-day-number">${day}</span>${appointmentCount}<span class="calendar-day-markers">${markers}</span></button>`);
    }
    calendarDays.innerHTML = cells.join("");
    renderDaySchedule(selectedCalendarDate);
  }

  function renderScheduleAppointment(appointment) {
    const symbol = statusSymbol(appointment.status);
    return `<button class="schedule-booking" type="button" data-calendar-action="details" data-id="${escapeHTML(appointment.id)}">
      <span class="calendar-status-icon ${statusClass(appointment.status)}" aria-hidden="true">${symbol}</span>
      <span class="schedule-booking-content"><strong>${escapeHTML(appointment.time)} · ${escapeHTML(appointment.patientName)}</strong><small>${escapeHTML(appointment.status)} · ${escapeHTML(appointment.type)}</small></span>
      <span class="schedule-booking-arrow" aria-hidden="true">›</span>
    </button>`;
  }

  function renderDaySchedule(dateKey) {
    const selectedDate = dateFromKey(dateKey);
    const doctor = findDoctor(selectedCalendarDoctorId);
    const dayPeriods = doctor ? doctorDayPeriods(doctor, dateKey) : [];
    const isWorkingDay = dayPeriods.length > 0;
    const todayKey = localDateKey(new Date());
    const isPastDate = dateKey < todayKey;
    const dayAppointments = appointments
      .filter((appointment) => appointment.date === dateKey && appointmentBelongsToDoctor(appointment, doctor))
      .sort((first, second) => (first.time || "").localeCompare(second.time || ""));
    const activeAppointments = dayAppointments.filter((appointment) => appointment.status !== "Cancelada");
    const cancelledAppointments = dayAppointments.filter((appointment) => appointment.status === "Cancelada");
    selectedDateTitle.textContent = appointmentDateLabel(dateKey);
    dayAppointmentCount.textContent = `${dayAppointments.length} ${dayAppointments.length === 1 ? "consulta" : "consultas"}`;
    const dayMessage = buildDayAgendaMessage(dateKey, dayAppointments, doctor?.name || "");
    const doctorPhone = doctor?.cellphone || "";
    shareDayAgendaLink.href = doctor ? whatsappUrl(dayMessage, doctorPhone) : "#";
    shareDayAgendaLink.hidden = !doctor;
    shareDayAgendaLink.setAttribute("aria-label", `Enviar resumo da agenda de ${formatLongDate(dateKey)} pelo WhatsApp`);
    shareDayAgendaLink.title = doctor ? `Enviar para ${doctor.name}; a mensagem poderá ser revisada antes do envio.` : "Cadastre um médico para compartilhar a agenda.";

    if (!doctor) {
      scheduleHoursNote.textContent = "Cadastre um médico para configurar os horários de atendimento.";
      dayScheduleList.innerHTML = '<p class="schedule-message"><strong>Nenhum médico cadastrado</strong><small>Cadastre um profissional para visualizar uma agenda individual.</small></p>';
      return;
    }

    const todayHours = dayPeriods.map((period) => (
      `${String(Math.floor(period.start / 60)).padStart(2, "0")}:${String(period.start % 60).padStart(2, "0")}–${String(Math.floor(period.end / 60)).padStart(2, "0")}:${String(period.end % 60).padStart(2, "0")}`
    )).join(" e ");
    scheduleHoursNote.textContent = `Atendimento hoje: ${todayHours || "não atende"} · primeira consulta ${doctor.firstDuration} min / retorno ${doctor.returnDuration} min.`;

    if (!isWorkingDay) {
      const closureMessage = `<p class="schedule-message"><span aria-hidden="true">☾</span><strong>${escapeHTML(doctor.name)} não atende neste dia</strong><small>Os dias de atendimento configurados são: ${escapeHTML(doctorDaysLabel(doctor))}.</small></p>`;
      dayScheduleList.innerHTML = closureMessage + (dayAppointments.length
        ? `<div class="schedule-exceptions"><h4>Consultas cadastradas</h4>${dayAppointments.map(renderScheduleAppointment).join("")}</div>`
        : "");
      return;
    }

    if (isPastDate) {
      dayScheduleList.innerHTML = dayAppointments.length
        ? `<p class="schedule-message"><strong>Consultas do dia</strong><small>Os horários vagos não são exibidos para datas passadas.</small></p>${dayAppointments.map(renderScheduleAppointment).join("")}`
        : `<p class="schedule-message"><strong>Dia sem consultas cadastradas</strong><small>Os horários vagos não são exibidos para datas passadas.</small></p>`;
      return;
    }

    const officeSlots = getDoctorSlots(doctor, selectedDate.getDay());
    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    let availableCount = 0;
    const slotRows = officeSlots.map((slot) => {
      const occupyingAppointments = activeAppointments.filter((appointment) => {
        const appointmentStart = timeToMinutes(appointment.time);
        const appointmentEnd = appointmentStart + appointmentDuration(appointment, doctor);
        const overlaps = appointmentStart < slot.end && appointmentEnd > slot.start;
        return overlaps;
      });
      const slotIsPast = dateKey === todayKey && slot.start < nowMinutes;
      let content = "";
      if (occupyingAppointments.length) {
        content = '<span class="slot-unavailable">Ocupado</span>';
      } else if (slotIsPast) {
        content = '<span class="slot-unavailable">Horário encerrado</span>';
      } else {
        availableCount += 1;
        content = `<button class="free-slot-button" type="button" data-book-date="${dateKey}" data-book-time="${slot.time}" data-doctor-id="${escapeHTML(doctor.id)}"><span aria-hidden="true">＋</span> Horário vago</button>`;
      }
      return `<div class="schedule-slot${occupyingAppointments.length ? " is-occupied" : ""}"><time>${slot.time}</time><div class="schedule-slot-content">${content}</div></div>`;
    });

    const bookings = dayAppointments.length
      ? `<div class="schedule-exceptions"><h4>Consultas cadastradas</h4>${dayAppointments.map(renderScheduleAppointment).join("")}</div>`
      : "";
    const scheduleIntro = `<p class="schedule-availability">${availableCount} horários vagos de ${doctor.firstDuration} min para primeira consulta</p>`;
    const groupedSlots = dayPeriods.map((period) => officeSlots
      .filter((slot) => slot.start >= period.start && slot.end <= period.end)
      .map((slot) => slotRows[officeSlots.indexOf(slot)]).join("")).join('<div class="schedule-break"><span>Intervalo</span><span>Sem atendimento</span></div>');
    dayScheduleList.innerHTML = scheduleIntro + groupedSlots + bookings;
  }

  function buildDayAgendaMessage(dateKey, dayAppointments, doctorName) {
    const sorted = dayAppointments.slice().sort((first, second) => (first.time || "").localeCompare(second.time || ""));
    const activeAppointments = sorted.filter((appointment) => appointment.status !== "Cancelada");
    const cancelledAppointments = sorted.filter((appointment) => appointment.status === "Cancelada");
    const lines = [
      `Olá, ${doctorName ? `Dr(a). ${doctorName}` : "Dr(a)."}! Segue o resumo da sua agenda de ${formatLongDate(dateKey)}:`,
      ""
    ];
    if (activeAppointments.length) {
      lines.push("CONSULTAS:");
      activeAppointments.forEach((appointment) => {
        lines.push(`• ${appointment.time} — ${appointment.patientName} (${appointment.status})${appointment.reason ? ` · ${appointment.reason}` : ""}`);
      });
    } else {
      lines.push("Nenhuma consulta ativa agendada para este dia.");
    }
    if (cancelledAppointments.length) {
      lines.push("", "CANCELAMENTOS:");
      cancelledAppointments.forEach((appointment) => {
        lines.push(`• ${appointment.time} — ${appointment.patientName} (Cancelada)`);
      });
    }
    return lines.join("\n");
  }

  function resetForm() {
    form.reset();
    appointmentFormError.hidden = true;
    document.getElementById("appointment-id").value = "";
    selectedAppointmentDoctorId = "";
    attendanceTypeInput.value = "Particular";
    updateInsuranceFields();
    updateAppointmentProcedures("");
    dateInput.min = localDateKey(new Date());
    document.getElementById("appointment-status").value = "Agendada";
    document.getElementById("payment-status").value = "Pendente";
    document.getElementById("appointment-value").value = "";
    appointmentSpecialtyInput.value = "";
    renderDoctorOptions();
    formTitle.textContent = "Agendar consulta";
    saveButton.innerHTML = "<span aria-hidden=\"true\">＋</span> Salvar consulta";
    cancelEditButton.hidden = true;
  }

  function openAppointmentForm(options = {}) {
    resetForm();
    setActiveView("agenda");
    if (options.doctorId) {
      const doctor = findDoctor(options.doctorId);
      if (doctor) {
        appointmentDoctorInput.value = doctor.id;
        appointmentSpecialtyInput.value = doctor.specialty;
        document.getElementById("appointment-value").value = doctor.consultationValue;
        selectedAppointmentDoctorId = doctor.id;
      }
    }
    updateAppointmentProcedures("");
    if (options.date) dateInput.value = options.date;
    if (options.time) document.getElementById("appointment-time").value = options.time;
    appointmentFormDialog.showModal();
    document.getElementById("patient-name").focus({ preventScroll: true });
  }

  function editAppointment(id) {
    const appointment = appointments.find((item) => item.id === id);
    if (!appointment) {
      showToast("Esta consulta não foi encontrada.");
      return;
    }
    document.getElementById("appointment-id").value = appointment.id;
    const values = [
      appointment.patientName, appointment.patientPhone, appointment.patientEmail,
      appointment.reason, appointment.doctorId || appointmentDoctor(appointment)?.id || "", appointment.date, appointment.time, appointment.type,
      appointment.status, appointment.value, appointment.paymentMethod,
      appointment.paymentStatus, appointment.notes
    ];
    fieldIds.forEach((fieldId, index) => { document.getElementById(fieldId).value = values[index] ?? ""; });
    selectedAppointmentDoctorId = appointment.doctorId || appointmentDoctor(appointment)?.id || "";
    const editingDoctor = findDoctor(selectedAppointmentDoctorId);
    appointmentSpecialtyInput.value = appointment.specialty || editingDoctor?.specialty || "";
    if (editingDoctor) document.getElementById("appointment-value").value = appointment.value || editingDoctor.consultationValue;
    attendanceTypeInput.value = appointment.attendanceType || "Particular";
    appointmentProcedureInput.value = appointment.procedureName || "";
    updateAppointmentProcedures(appointment.procedureName || "");
    insuranceNameInput.value = appointment.insuranceName || "";
    insuranceReimbursementInput.value = appointment.insuranceReimbursement || "";
    updateInsuranceFields();
    dateInput.min = appointment.date < localDateKey(new Date()) ? appointment.date : localDateKey(new Date());
    formTitle.textContent = "Editar consulta";
    saveButton.innerHTML = "<span aria-hidden=\"true\">✓</span> Salvar alterações";
    cancelEditButton.hidden = false;
    setActiveView("agenda");
    appointmentFormDialog.showModal();
    document.getElementById("patient-name").focus({ preventScroll: true });
  }

  function renderDetails(appointment) {
    const paymentLine = [appointment.paymentMethod, appointment.paymentStatus].filter(Boolean).join(" · ") || "A definir";
    const attendanceType = appointment.attendanceType || "Particular";
    const paymentValue = appointment.paymentStatus === "Pago"
      ? (appointment.paidValue ?? appointment.value)
      : appointment.value;
    appointmentDetails.innerHTML = `<div class="details-grid">
      <div class="detail-item"><span>Paciente</span><strong>${escapeHTML(appointment.patientName)}</strong></div>
      <div class="detail-item"><span>Telefone / WhatsApp</span><strong>${escapeHTML(appointment.patientPhone)}</strong></div>
      <div class="detail-item"><span>E-mail</span><strong>${escapeHTML(appointment.patientEmail || "Não informado")}</strong></div>
      <div class="detail-item"><span>Data e horário</span><strong>${escapeHTML(formatDate(appointment.date))} às ${escapeHTML(appointment.time)}</strong></div>
      <div class="detail-item"><span>Especialidade</span><strong>${escapeHTML(appointment.specialty || appointmentDoctor(appointment)?.specialty || "Não informada")}</strong></div>
      <div class="detail-item"><span>Motivo da consulta</span><strong>${escapeHTML(appointment.reason)}</strong></div>
      <div class="detail-item"><span>Médico responsável</span><strong>${escapeHTML(appointmentDoctor(appointment)?.name || appointment.doctorName || "Não vinculado")}${appointmentDoctor(appointment)?.specialty ? ` · ${escapeHTML(appointmentDoctor(appointment).specialty)}` : ""}</strong></div>
      <div class="detail-item"><span>Tipo de consulta</span><strong>${escapeHTML(appointment.type)}</strong></div>
      ${appointment.procedureName ? `<div class="detail-item"><span>Procedimento</span><strong>${escapeHTML(appointment.procedureName)}</strong></div>` : ""}
      <div class="detail-item"><span>Atendimento</span><strong>${escapeHTML(attendanceType)}</strong></div>
      ${attendanceType === "Convênio" ? `<div class="detail-item"><span>Convênio</span><strong>${escapeHTML(appointment.insuranceName || "Não informado")}</strong></div><div class="detail-item"><span>Repasse previsto</span><strong>${escapeHTML(formatCurrency(appointment.insuranceReimbursement))}</strong></div>` : ""}
      <div class="detail-item"><span>Situação</span><strong><span class="status-badge ${statusClass(appointment.status)}">${escapeHTML(appointment.status)}</span></strong></div>
      <div class="detail-item"><span>Valor da consulta</span><strong>${escapeHTML(formatCurrency(appointment.value))}</strong></div>
      <div class="detail-item"><span>Pagamento</span><strong>${escapeHTML(formatCurrency(paymentValue))} · ${escapeHTML(paymentLine)}</strong></div>
    </div>
    ${appointment.notes ? `<div class="original-note"><strong>Observação do agendamento</strong><p>${escapeHTML(appointment.notes)}</p></div>` : ""}`;
    document.getElementById("details-confirm-payment").hidden = appointment.paymentStatus === "Pago" || appointment.paymentStatus === "Isento";
    paymentConfirmationForm.hidden = true;

    const observations = Array.isArray(appointment.observations) ? appointment.observations : [];
    observationList.innerHTML = observations.length
      ? observations.slice().reverse().map((item) => `<article class="observation-item"><span class="observation-dot" aria-hidden="true"></span><div><p>${escapeHTML(item.text)}</p><time>${escapeHTML(formatTimestamp(item.createdAt))}</time></div></article>`).join("")
      : `<p class="observations-empty">Ainda não há observações para esta consulta.</p>`;
    document.getElementById("details-title").textContent = appointment.patientName;
  }

  function openDetails(id) {
    const appointment = appointments.find((item) => item.id === id);
    if (!appointment) {
      showToast("Esta consulta não foi encontrada.");
      return;
    }
    activeDetailsId = id;
    newObservation.value = "";
    renderDetails(appointment);
    detailsDialog.showModal();
  }

  async function addObservation(text) {
    const content = text.trim();
    if (!activeDetailsId || !content) return;
    const index = appointments.findIndex((item) => item.id === activeDetailsId);
    if (index < 0) {
      showToast("Esta consulta não foi encontrada.");
      detailsDialog.close();
      return;
    }

    const previous = appointments;
    const appointment = appointments[index];
    const updated = {
      ...appointment,
      observations: [
        ...(Array.isArray(appointment.observations) ? appointment.observations : []),
        { text: content, createdAt: new Date().toISOString() }
      ]
    };
    appointments = appointments.map((item, itemIndex) => itemIndex === index ? updated : item);
    if (!(await saveAppointments())) {
      appointments = previous;
      return;
    }
    render();
    renderDetails(updated);
    newObservation.value = "";
    showToast("Observação adicionada.");
  }

  function openPaymentConfirmation() {
    if (!activeDetailsId) return;
    const appointment = appointments.find((item) => item.id === activeDetailsId);
    if (!appointment) {
      showToast("Esta consulta não foi encontrada.");
      detailsDialog.close();
      return;
    }
    if (appointment.paymentStatus === "Pago" || appointment.paymentStatus === "Isento") return;
    confirmationPaymentValue.value = appointment.attendanceType === "Convênio"
      ? (appointment.insuranceReimbursement || appointment.value || "")
      : (appointment.value || "");
    confirmationPaymentMethod.value = appointment.paymentMethod
      || (appointment.attendanceType === "Convênio" ? "Convênio" : "");
    paymentConfirmationForm.hidden = false;
    paymentConfirmationForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
    if (!confirmationPaymentMethod.value) confirmationPaymentMethod.focus();
  }

  async function confirmPayment() {
    if (!activeDetailsId) return;
    const index = appointments.findIndex((item) => item.id === activeDetailsId);
    if (index < 0) {
      showToast("Esta consulta não foi encontrada.");
      detailsDialog.close();
      return;
    }
    const appointment = appointments[index];
    if (appointment.paymentStatus === "Pago" || appointment.paymentStatus === "Isento") return;

    if (!paymentConfirmationForm.reportValidity()) return;
    const paymentMethod = confirmationPaymentMethod.value;
    const paymentValue = Number(confirmationPaymentValue.value);
    if (!paymentMethod || !Number.isFinite(paymentValue) || paymentValue <= 0) {
      showToast("Informe um valor recebido e o método de pagamento.");
      return;
    }

    const previous = appointments;
    const updated = {
      ...appointment,
      paidValue: String(paymentValue),
      paymentMethod,
      paymentStatus: "Pago",
      paidAt: new Date().toISOString()
    };
    appointments = appointments.map((item, itemIndex) => itemIndex === index ? updated : item);
    if (!(await saveAppointments())) {
      appointments = previous;
      return;
    }
    render();
    renderDetails(updated);
    showToast("Pagamento confirmado.");
  }

  function updateInsuranceFields(selectedInsuranceName = insuranceNameInput.value) {
    const isInsurance = attendanceTypeInput.value === "Convênio";
    const doctor = findDoctor(appointmentDoctorInput.value);
    const availableInsurances = doctorInsurances(doctor);
    const selectedInsurance = doctorInsurance(doctor, selectedInsuranceName);
    const legacyInsurance = selectedInsuranceName && !selectedInsurance
      ? `<option value="${escapeHTML(selectedInsuranceName)}">${escapeHTML(selectedInsuranceName)} (consulta existente)</option>`
      : "";
    insuranceNameInput.innerHTML = `<option value="">${availableInsurances.length ? "Selecione um convênio" : "Nenhum convênio cadastrado para este médico"}</option>${legacyInsurance}${availableInsurances.map((insurance) => `<option value="${escapeHTML(insurance.name)}">${escapeHTML(insurance.name)}</option>`).join("")}`;
    insuranceNameInput.value = selectedInsuranceName && (selectedInsurance || legacyInsurance) ? selectedInsuranceName : "";
    insuranceFields.hidden = !isInsurance;
    insuranceNameInput.disabled = !isInsurance;
    insuranceNameInput.required = isInsurance;
    insuranceReimbursementInput.disabled = !isInsurance;
    insuranceReimbursementInput.required = isInsurance;
    if (selectedInsurance) insuranceReimbursementInput.value = selectedInsurance.reimbursement;
    else if (!selectedInsuranceName) insuranceReimbursementInput.value = "";
  }

  function doctorScheduleConflict(doctor) {
    const booked = appointments.filter((appointment) => appointment.status !== "Cancelada"
      && appointmentBelongsToDoctor(appointment, doctor));
    for (const appointment of booked) {
      const day = dateFromKey(appointment.date).getDay();
      const start = timeToMinutes(appointment.time);
      const duration = appointmentDuration(appointment, doctor);
      const end = start + duration;
      if (!doctorWorkingPeriods(doctor, day).some((period) => start >= period.start && end <= period.end)) {
        return `A alteração deixa a consulta de ${appointment.patientName}, em ${formatDate(appointment.date)} às ${appointment.time}, fora do expediente configurado.`;
      }
    }
    const sorted = booked.slice().sort((first, second) => (
      first.date.localeCompare(second.date) || first.time.localeCompare(second.time)
    ));
    for (let index = 1; index < sorted.length; index += 1) {
      const previous = sorted[index - 1];
      const current = sorted[index];
      if (previous.date !== current.date) continue;
      const previousEnd = timeToMinutes(previous.time) + appointmentDuration(previous, doctor);
      if (timeToMinutes(current.time) < previousEnd) {
        return `A nova duração cria conflito entre as consultas de ${previous.patientName} e ${current.patientName} em ${formatDate(current.date)}.`;
      }
    }
    return "";
  }

  function editDoctor(id) {
    const doctor = findDoctor(id);
    if (!doctor) {
      showToast("Este médico não foi encontrado.");
      return;
    }
    document.getElementById("doctor-id").value = doctor.id;
    document.getElementById("doctor-full-name").value = doctor.name;
    document.getElementById("doctor-specialty").value = doctor.specialty || "";
    document.getElementById("doctor-cellphone").value = doctor.cellphone || "";
    document.getElementById("doctor-consultation-value").value = doctor.consultationValue || "";
    document.getElementById("doctor-first-duration").value = doctor.firstDuration || 60;
    document.getElementById("doctor-return-duration").value = doctor.returnDuration || 30;
    renderDoctorWeeklySchedule(doctor.workingDays || legacyWorkingDays(doctor));
    doctorInsuranceList.replaceChildren();
    doctorInsurances(doctor).forEach(addDoctorInsuranceRow);
    doctorProcedureList.replaceChildren();
    doctorProcedures(doctor).forEach(addDoctorProcedureRow);
    document.getElementById("doctors-title").textContent = "Editar médico";
    document.getElementById("doctor-form-description").textContent = `Atualize os dados, horários e procedimentos de ${doctor.name}.`;
    document.getElementById("save-doctor-button").innerHTML = '<span aria-hidden="true">✓</span> Salvar alterações';
    document.getElementById("cancel-doctor-edit").hidden = false;
    document.getElementById("doctor-form").scrollIntoView({ behavior: "smooth", block: "start" });
    document.getElementById("doctor-full-name").focus({ preventScroll: true });
  }

  async function deleteDoctor(id) {
    const doctor = findDoctor(id);
    if (!doctor) {
      showToast("Este médico não foi encontrado.");
      return;
    }
    if (appointments.some((appointment) => appointmentBelongsToDoctor(appointment, doctor))) {
      showToast("Não é possível excluir este médico porque existem consultas vinculadas. Preserve o histórico ou remova as consultas antes.");
      return;
    }
    if (!window.confirm(`Excluir o cadastro de ${doctor.name}? Esta ação não pode ser desfeita.`)) return;
    const previous = doctors;
    doctors = doctors.filter((item) => item.id !== id);
    if (!(await saveDoctors())) {
      doctors = previous;
      return;
    }
    if (selectedCalendarDoctorId === id) selectedCalendarDoctorId = doctors[0]?.id || "";
    if (document.getElementById("doctor-id").value === id) resetDoctorForm();
    render();
    showToast(`Cadastro de ${doctor.name} excluído.`);
  }

  function legacyWorkingDays(doctor) {
    if (!doctor.workingHours) return {};
    return Object.fromEntries((doctor.serviceDays || []).map((day) => [String(day), { ...doctor.workingHours }]));
  }

  function resetDoctorForm() {
    doctorForm.reset();
    document.getElementById("doctor-id").value = "";
    renderDoctorWeeklySchedule();
    doctorInsuranceList.replaceChildren();
    doctorProcedureList.replaceChildren();
    document.getElementById("doctors-title").textContent = "Cadastrar médico";
    document.getElementById("doctor-form-description").textContent = "Cadastre os profissionais e configure dias, horários, duração e valor das consultas.";
    document.getElementById("save-doctor-button").innerHTML = '<span aria-hidden="true">＋</span> Salvar médico';
    document.getElementById("cancel-doctor-edit").hidden = true;
  }

  doctorForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!doctorForm.reportValidity()) return;

    const id = document.getElementById("doctor-id").value;
    const workingDays = {};
    const enabledDays = [...doctorWeeklySchedule.querySelectorAll("[data-day-enabled]:checked")];
    for (const checkbox of enabledDays) {
      const day = checkbox.dataset.dayEnabled;
      const hours = Object.fromEntries(["morningStart", "morningEnd", "afternoonStart", "afternoonEnd"]
        .map((period) => [period, document.getElementById(`doctor-day-${day}-${period}`).value]));
      const morningStart = timeToMinutes(hours.morningStart);
      const morningEnd = timeToMinutes(hours.morningEnd);
      const afternoonStart = hours.afternoonStart ? timeToMinutes(hours.afternoonStart) : -1;
      const afternoonEnd = hours.afternoonEnd ? timeToMinutes(hours.afternoonEnd) : -1;
      if (morningStart < 0 || morningEnd <= morningStart) {
        showToast("Informe um primeiro período válido para cada dia ativo.");
        return;
      }
      if (Boolean(hours.afternoonStart) !== Boolean(hours.afternoonEnd)
        || (hours.afternoonStart && (afternoonStart < morningEnd || afternoonEnd <= afternoonStart))) {
        showToast("Confira o segundo período de cada dia: ele deve começar após o primeiro.");
        return;
      }
      workingDays[day] = hours;
    }
    const firstDuration = Number(document.getElementById("doctor-first-duration").value);
    const returnDuration = Number(document.getElementById("doctor-return-duration").value);
    const cellphone = document.getElementById("doctor-cellphone").value.trim();

    if (!enabledDays.length) {
      showToast("Selecione pelo menos um dia de atendimento.");
      return;
    }
    if (!normalizeBrazilPhone(cellphone)) {
      showToast("Informe um celular válido com DDD para o médico.");
      return;
    }
    if ([firstDuration, returnDuration].some((duration) => !Number.isInteger(duration) || duration < 5 || duration > 240)) {
      showToast("A duração média deve estar entre 5 e 240 minutos.");
      return;
    }
    const insuranceRows = [...doctorInsuranceList.querySelectorAll(".doctor-insurance-row")];
    const insurances = [];
    const seenInsuranceNames = new Set();
    for (const row of insuranceRows) {
      const name = row.querySelector("[data-insurance-name]").value.trim();
      const reimbursementValue = row.querySelector("[data-insurance-value]").value;
      if (!name && !reimbursementValue) continue;
      const key = name.toLocaleLowerCase("pt-BR");
      const reimbursement = Number(reimbursementValue);
      if (!name || !reimbursementValue || !Number.isFinite(reimbursement) || reimbursement < 0) {
        showToast("Preencha o nome e um valor de repasse válido para cada convênio.");
        return;
      }
      if (seenInsuranceNames.has(key)) {
        showToast("Não repita o nome de um convênio para o mesmo médico.");
        return;
      }
      seenInsuranceNames.add(key);
      insurances.push({ name, reimbursement: String(reimbursement) });
    }
    const procedureRows = [...doctorProcedureList.querySelectorAll(".doctor-procedure-row")];
    const procedures = [];
    const seenProcedureNames = new Set();
    for (const row of procedureRows) {
      const name = row.querySelector("[data-procedure-name]").value.trim();
      const procedureValue = row.querySelector("[data-procedure-value]").value;
      if (!name && !procedureValue) continue;
      const key = name.toLocaleLowerCase("pt-BR");
      const value = Number(procedureValue);
      if (!name || !procedureValue || !Number.isFinite(value) || value < 0) {
        showToast("Preencha o nome e um valor válido para cada procedimento.");
        return;
      }
      if (seenProcedureNames.has(key)) {
        showToast("Não repita o nome de um procedimento para o mesmo médico.");
        return;
      }
      seenProcedureNames.add(key);
      procedures.push({ name, value: String(value) });
    }
    const firstDayHours = workingDays[Object.keys(workingDays)[0]];

    const doctor = {
      id: id || (window.crypto && typeof window.crypto.randomUUID === "function" ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`),
      name: document.getElementById("doctor-full-name").value.trim(),
      specialty: document.getElementById("doctor-specialty").value.trim(),
      cellphone,
      consultationValue: document.getElementById("doctor-consultation-value").value,
      serviceDays: Object.keys(workingDays),
      workingDays,
      workingHours: firstDayHours,
      insurances,
      procedures,
      firstDuration,
      returnDuration
    };
    if (!doctor.name || !doctor.specialty) {
      showToast("Informe o nome e a especialidade do médico.");
      return;
    }
    const scheduleConflict = doctorScheduleConflict(doctor);
    if (scheduleConflict) {
      showToast(scheduleConflict);
      return;
    }

    const previous = doctors;
    const existingIndex = doctors.findIndex((item) => item.id === id);
    doctors = existingIndex < 0
      ? [...doctors, doctor]
      : doctors.map((item, index) => index === existingIndex ? doctor : item);
    if (!(await saveDoctors())) {
      doctors = previous;
      return;
    }
    selectedCalendarDoctorId = doctor.id;
    resetDoctorForm();
    render();
    showToast(existingIndex < 0 ? "Médico cadastrado com sucesso." : "Cadastro do médico atualizado.");
  });

  async function deleteAppointment(id) {
    const appointment = appointments.find((item) => item.id === id);
    if (!appointment || !window.confirm(`Excluir a consulta de ${appointment.patientName}?`)) return;
    const previous = appointments;
    appointments = appointments.filter((item) => item.id !== id);
    if (!(await saveAppointments())) {
      appointments = previous;
      return;
    }
    render();
    showToast("Consulta excluída.");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;

    const id = document.getElementById("appointment-id").value;
    const existing = id ? appointments.find((item) => item.id === id) : null;
    const doctor = findDoctor(appointmentDoctorInput.value);
    if (!doctor) {
      showToast("Selecione um médico cadastrado antes de agendar.");
      return;
    }
    const appointmentType = document.getElementById("appointment-type").value;
    const appointment = {
      id: id || (window.crypto && typeof window.crypto.randomUUID === "function" ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`),
      patientName: document.getElementById("patient-name").value.trim(),
      patientPhone: document.getElementById("patient-phone").value.trim(),
      patientEmail: document.getElementById("patient-email").value.trim(),
      reason: document.getElementById("appointment-reason").value.trim(),
      specialty: appointmentSpecialtyInput.value,
      doctorId: doctor.id,
      doctorName: doctor.name,
      date: document.getElementById("appointment-date").value,
      time: document.getElementById("appointment-time").value,
      type: appointmentType,
      procedureName: appointmentProcedureInput.value,
      duration: appointmentType === "Retorno" ? doctor.returnDuration : doctor.firstDuration,
      attendanceType: attendanceTypeInput.value,
      insuranceName: attendanceTypeInput.value === "Convênio" ? insuranceNameInput.value.trim() : "",
      insuranceReimbursement: attendanceTypeInput.value === "Convênio" ? insuranceReimbursementInput.value : "",
      status: document.getElementById("appointment-status").value,
      value: document.getElementById("appointment-value").value,
      paymentMethod: document.getElementById("payment-method").value,
      paymentStatus: document.getElementById("payment-status").value,
      paidAt: document.getElementById("payment-status").value === "Pago"
        ? (existing && existing.paymentStatus === "Pago" ? existing.paidAt : new Date().toISOString())
        : null,
      paidValue: document.getElementById("payment-status").value === "Pago"
        ? (existing && existing.paymentStatus === "Pago"
          ? (existing.paidValue ?? existing.value)
          : (attendanceTypeInput.value === "Convênio"
            ? (insuranceReimbursementInput.value || document.getElementById("appointment-value").value)
            : document.getElementById("appointment-value").value))
        : null,
      notes: document.getElementById("appointment-notes").value.trim(),
      createdAt: existing ? existing.createdAt : new Date().toISOString()
    };

    if (!appointment.patientName || !appointment.patientPhone || !appointment.reason || !appointment.date || !appointment.time) {
      showToast("Preencha todos os campos obrigatórios.");
      return;
    }
    if (appointment.value && Number(appointment.value) < 0) {
      showToast("O valor da consulta não pode ser negativo.");
      return;
    }
    if (appointment.insuranceReimbursement && Number(appointment.insuranceReimbursement) < 0) {
      showToast("O valor de repasse não pode ser negativo.");
      return;
    }
    if (appointment.attendanceType === "Convênio") {
      const acceptedInsurance = doctorInsurance(doctor, appointment.insuranceName);
      if ((!appointment.insuranceName || !appointment.insuranceReimbursement)
        || (!acceptedInsurance && existing?.insuranceName !== appointment.insuranceName)) {
        showToast("Selecione um convênio aceito e cadastrado para este médico.");
        return;
      }
      if (acceptedInsurance) appointment.insuranceReimbursement = String(acceptedInsurance.reimbursement);
    }
    if (appointment.procedureName
      && !doctorProcedures(doctor).some((procedure) => procedure.name === appointment.procedureName)
      && existing?.procedureName !== appointment.procedureName) {
      showToast("Selecione um procedimento cadastrado para este médico.");
      return;
    }
    if (appointment.status !== "Cancelada") {
      const appointmentStart = timeToMinutes(appointment.time);
      const appointmentEnd = appointmentStart + appointment.duration;
      const serviceDay = String(dateFromKey(appointment.date).getDay());
      if (!doctorWorkingPeriods(doctor, Number(serviceDay)).length) {
        showToast(`${doctor.name} não atende no dia da semana selecionado.`);
        return;
      }
      if (!doctorWorkingPeriods(doctor, Number(serviceDay)).some((period) => appointmentStart >= period.start && appointmentEnd <= period.end)) {
        showToast(`O horário não comporta uma consulta de ${appointment.duration} min dentro do expediente de ${doctor.name}.`);
        return;
      }
      const conflict = appointments.find((other) => {
        if (other.id === appointment.id || other.date !== appointment.date || other.status === "Cancelada"
          || !appointmentBelongsToDoctor(other, doctor)) return false;
        const otherStart = timeToMinutes(other.time);
        const otherEnd = otherStart + appointmentDuration(other, doctor);
        return otherStart >= 0
          && appointmentStart < otherEnd
          && appointmentEnd > otherStart;
      });
      if (conflict) {
        showToast(`Este horário conflita com a consulta de ${conflict.patientName} com ${doctor.name}.`);
        return;
      }
    }

    const previous = appointments;
    appointments = existing
      ? appointments.map((item) => item.id === id ? appointment : item)
      : [...appointments, appointment];
    if (!(await saveAppointments())) {
      appointments = previous;
      return;
    }
    resetForm();
    appointmentFormDialog.close();
    render();
    showToast(existing ? "Consulta atualizada com sucesso." : "Consulta agendada com sucesso.");
  });

  list.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (button) {
      if (button.dataset.action === "edit") editAppointment(button.dataset.id);
      if (button.dataset.action === "delete") deleteAppointment(button.dataset.id);
      return;
    }
    const row = event.target.closest("tr[data-id]");
    if (row) openDetails(row.dataset.id);
  });

  list.addEventListener("keydown", (event) => {
    if ((event.key !== "Enter" && event.key !== " ") || event.target.closest("button")) return;
    const row = event.target.closest("tr[data-id]");
    if (!row) return;
    event.preventDefault();
    openDetails(row.dataset.id);
  });

  document.getElementById("close-details").addEventListener("click", () => detailsDialog.close());
  detailsDialog.addEventListener("click", (event) => {
    if (event.target === detailsDialog) detailsDialog.close();
  });
  detailsDialog.addEventListener("close", () => { activeDetailsId = null; });
  document.getElementById("details-edit").addEventListener("click", () => {
    const id = activeDetailsId;
    detailsDialog.close();
    if (id) editAppointment(id);
  });
  document.getElementById("details-confirm-payment").addEventListener("click", openPaymentConfirmation);
  attendanceTypeInput.addEventListener("change", () => updateInsuranceFields());
  insuranceNameInput.addEventListener("change", () => updateInsuranceFields(insuranceNameInput.value));
  paymentConfirmationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    confirmPayment();
  });
  document.getElementById("cancel-payment-confirmation").addEventListener("click", () => {
    paymentConfirmationForm.hidden = true;
  });
  observationForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!observationForm.reportValidity()) return;
    addObservation(newObservation.value);
  });
  document.getElementById("record-confirmation").addEventListener("click", () => {
    addObservation("Confirmação de presença registrada.");
  });
  document.querySelectorAll("[data-view]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      if (link.dataset.view === "form") {
        openAppointmentForm();
        return;
      }
      setActiveView(link.dataset.view);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
  doctorWeeklySchedule.addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-day-enabled]");
    if (!checkbox) return;
    doctorWeeklySchedule.querySelectorAll(`[id^="doctor-day-${checkbox.dataset.dayEnabled}-"]`)
      .forEach((input) => { input.disabled = !checkbox.checked; });
  });
  document.getElementById("add-doctor-insurance").addEventListener("click", () => addDoctorInsuranceRow());
  document.getElementById("add-doctor-procedure").addEventListener("click", () => addDoctorProcedureRow());
  document.getElementById("cancel-doctor-edit").addEventListener("click", resetDoctorForm);
  doctorList.addEventListener("click", (event) => {
    const editButton = event.target.closest("[data-edit-doctor]");
    if (editButton) {
      editDoctor(editButton.dataset.editDoctor);
      return;
    }
    const deleteButton = event.target.closest("[data-delete-doctor]");
    if (deleteButton) deleteDoctor(deleteButton.dataset.deleteDoctor);
  });
  doctorInsuranceList.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-insurance]");
    if (removeButton) removeButton.closest(".doctor-insurance-row").remove();
  });
  doctorProcedureList.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-procedure]");
    if (removeButton) removeButton.closest(".doctor-procedure-row").remove();
  });
  calendarDays.addEventListener("click", (event) => {
    const dayButton = event.target.closest("button[data-date]");
    if (!dayButton) return;
    selectedCalendarDate = dayButton.dataset.date;
    renderCalendar();
  });
  document.getElementById("calendar-previous").addEventListener("click", () => {
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1);
    selectedCalendarDate = localDateKey(calendarMonth);
    renderCalendar();
  });
  document.getElementById("calendar-next").addEventListener("click", () => {
    calendarMonth = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1);
    selectedCalendarDate = localDateKey(calendarMonth);
    renderCalendar();
  });
  document.getElementById("calendar-today").addEventListener("click", () => {
    const currentDate = new Date();
    calendarMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    selectedCalendarDate = localDateKey(currentDate);
    renderCalendar();
  });
  calendarDoctorFilter.addEventListener("change", () => {
    selectedCalendarDoctorId = calendarDoctorFilter.value;
    renderCalendar();
  });
  document.getElementById("confirmation-alert-card").addEventListener("click", () => {
    setActiveView("agenda");
    confirmationAlert.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  shareDayAgendaLink.addEventListener("click", (event) => {
    if (!findDoctor(selectedCalendarDoctorId)) {
      event.preventDefault();
      showToast("Selecione um médico cadastrado para compartilhar a agenda.");
      return;
    }
    event.preventDefault();
    openWhatsAppInNamedTab(shareDayAgendaLink.href);
  });
  confirmationList.addEventListener("click", (event) => {
    const confirmButton = event.target.closest("button[data-confirm-appointment]");
    if (confirmButton) {
      confirmAppointment(confirmButton.dataset.confirmAppointment);
      return;
    }
    const link = event.target.closest("a.button-whatsapp");
    if (!link) return;
    event.preventDefault();
    openWhatsAppInNamedTab(link.href);
  });
  openWhatsappButton.addEventListener("click", initializeWhatsApp);
  dayScheduleList.addEventListener("click", (event) => {
    const detailsButton = event.target.closest('button[data-calendar-action="details"]');
    if (detailsButton) {
      openDetails(detailsButton.dataset.id);
      return;
    }
    const freeSlotButton = event.target.closest("button[data-book-date]");
    if (!freeSlotButton) return;
    if (!findDoctor(freeSlotButton.dataset.doctorId)) {
      showToast("Este médico não está mais cadastrado.");
      return;
    }
    openAppointmentForm({
      doctorId: freeSlotButton.dataset.doctorId,
      date: freeSlotButton.dataset.bookDate,
      time: freeSlotButton.dataset.bookTime
    });
  });
  cancelEditButton.addEventListener("click", () => {
    resetForm();
    appointmentFormDialog.close();
  });
  document.getElementById("new-appointment").addEventListener("click", () => openAppointmentForm());
  document.getElementById("close-appointment-form").addEventListener("click", () => appointmentFormDialog.close());
  appointmentFormDialog.addEventListener("click", (event) => {
    if (event.target === appointmentFormDialog) appointmentFormDialog.close();
  });
  form.addEventListener("reset", () => window.setTimeout(() => {
    if (!document.getElementById("appointment-id").value) {
      document.getElementById("appointment-status").value = "Agendada";
      document.getElementById("payment-status").value = "Pendente";
      updateInsuranceFields();
    }
  }, 0));
  searchInput.addEventListener("input", render);
  dateFilter.addEventListener("change", render);
  statusFilter.addEventListener("change", render);
  appointmentDoctorFilter.addEventListener("change", render);
  appointmentDoctorInput.addEventListener("change", () => {
    const doctor = findDoctor(appointmentDoctorInput.value);
    selectedAppointmentDoctorId = doctor?.id || "";
    appointmentSpecialtyInput.value = doctor?.specialty || "";
    if (doctor) document.getElementById("appointment-value").value = doctor.consultationValue;
    updateInsuranceFields("");
    updateAppointmentProcedures("");
  });
  appointmentProcedureInput.addEventListener("change", () => {
    const procedure = doctorProcedures(findDoctor(appointmentDoctorInput.value))
      .find((item) => item.name === appointmentProcedureInput.value);
    if (procedure) document.getElementById("appointment-value").value = procedure.value;
  });
  form.addEventListener("input", () => { appointmentFormError.hidden = true; });
  form.addEventListener("change", () => { appointmentFormError.hidden = true; });
  financialDateFrom.addEventListener("change", renderFinancialData);
  financialDateTo.addEventListener("change", renderFinancialData);
  financialDoctorFilter.addEventListener("change", renderFinancialData);
  document.getElementById("financial-filter-reset").addEventListener("click", () => {
    const currentDate = new Date();
    financialDateFrom.value = localDateKey(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
    financialDateTo.value = localDateKey(currentDate);
    financialDoctorFilter.value = "all";
    renderFinancialData();
  });

  document.getElementById("export-data").addEventListener("click", exportSystemData);
  manageUsersButton.addEventListener("click", () => userDialog.showModal());
  document.getElementById("close-user-dialog").addEventListener("click", () => userDialog.close());
  document.getElementById("cancel-user-create").addEventListener("click", () => userDialog.close());
  userDialog.addEventListener("click", (event) => {
    if (event.target === userDialog) userDialog.close();
  });
  userForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!userForm.reportValidity()) return;
    const submitButton = userForm.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    try {
      await apiRequest("/api/users", {
        method: "POST",
        body: JSON.stringify({
          email: document.getElementById("new-user-email").value.trim(),
          password: document.getElementById("new-user-password").value
        })
      });
      userForm.reset();
      userDialog.close();
      showToast("Usuário criado. Compartilhe as credenciais por um canal seguro.");
    } catch (error) {
      console.error("Não foi possível criar o usuário.", error);
      showToast(error.message);
    } finally {
      submitButton.disabled = false;
    }
  });
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    authError.hidden = true;
    loginButton.disabled = true;
    loginButton.textContent = "Entrando...";
    try {
      const result = await apiRequest("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: loginEmail.value.trim(), password: loginPassword.value })
      });
      authToken = result.token;
      currentUserRole = result.user.role;
      sessionStorage.setItem(TOKEN_KEY, authToken);
      await loadCloudState();
      loginPassword.value = "";
    } catch (error) {
      console.error("Não foi possível entrar no AgendeAqui.", error);
      authToken = "";
      currentUserRole = "";
      sessionStorage.removeItem(TOKEN_KEY);
      showLogin(error.message);
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = "Entrar";
    }
  });
  document.getElementById("logout-button").addEventListener("click", () => {
    authToken = "";
    sessionStorage.removeItem(TOKEN_KEY);
    appointments = [];
    doctors = [];
    cloudSnapshots.appointments = [];
    cloudSnapshots.doctors = [];
    showLogin();
  });
  document.querySelectorAll('a[href="#formulario"]:not([data-view])').forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      openAppointmentForm();
    });
  });

  todayLabel.textContent = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  dateInput.min = localDateKey(new Date());
  renderDoctorWeeklySchedule();
  const currentDate = new Date();
  financialDateFrom.value = localDateKey(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
  financialDateTo.value = localDateKey(currentDate);
  updateInsuranceFields("");
  void initializeCloudSession();
  window.setInterval(() => { void refreshCloudState(); }, 30000);
  window.addEventListener("focus", () => { void refreshCloudState(); });
})();
