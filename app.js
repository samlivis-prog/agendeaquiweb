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
  const doctorFormDialog = document.getElementById("doctor-form-dialog");
  const doctorFormError = document.getElementById("doctor-form-error");
  const doctorPhotoInput = document.getElementById("doctor-photo");
  const doctorPhotoImage = document.getElementById("doctor-photo-image");
  const doctorPhotoPlaceholder = document.getElementById("doctor-photo-placeholder");
  const removeDoctorPhotoButton = document.getElementById("remove-doctor-photo");
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
  const medicalRecordsPanel = document.getElementById("medical-records-panel");
  const medicalRecordAppointment = document.getElementById("medical-record-appointment");
  const medicalRecordPatient = document.getElementById("medical-record-patient");
  const medicalRecordEmpty = document.getElementById("medical-record-empty");
  const medicalRecordForm = document.getElementById("medical-record-form");
  const medicalRecordUpdated = document.getElementById("medical-record-updated");
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
  const userListSection = document.querySelector(".user-list-section");
  const userList = document.getElementById("user-list");
  const userListMessage = document.getElementById("user-list-message");
  const userFormError = document.getElementById("user-form-error");
  const userFormTitle = document.getElementById("user-dialog-title");
  const userFormDescription = document.getElementById("user-form-description");
  const saveUserButton = document.getElementById("save-user-button");
  const newUserPassword = document.getElementById("new-user-password");
  const editUserPassword = document.getElementById("edit-user-password");
  const newUserPasswordField = document.getElementById("new-user-password-field");
  const editUserPasswordField = document.getElementById("edit-user-password-field");
  const newUserRole = document.getElementById("new-user-role");
  const newUserDoctorField = document.getElementById("new-user-doctor-field");
  const newUserDoctor = document.getElementById("new-user-doctor");
  const appearanceDialog = document.getElementById("appearance-dialog");
  const appearanceForm = document.getElementById("appearance-form");
  const appearanceError = document.getElementById("appearance-error");
  const clinicLogoInput = document.getElementById("clinic-logo-input");
  const appearanceLogoImage = document.getElementById("appearance-logo-image");
  const appearanceLogoPlaceholder = document.getElementById("appearance-logo-placeholder");
  const removeClinicLogoButton = document.getElementById("remove-clinic-logo");
  const clinicBrand = document.getElementById("clinic-brand");
  const clinicBrandLogo = document.getElementById("clinic-brand-logo");
  const clinicLogoMobile = document.getElementById("clinic-logo-mobile");
  let currentUserRole = "";
  let currentUserDoctorId = "";
  let editingUserId = "";
  let clinicSettings = { palette: "sage", logo: null };
  let draftClinicLogo = null;
  let doctorPhotoData = "";
  let doctorPhotoProcessing = false;
  let medicalRecords = new Map();
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
    if (detailsDialog.open) detailsDialog.close();
    if (appointmentFormDialog.open) appointmentFormDialog.close();
    if (appearanceDialog.open) appearanceDialog.close();
    if (doctorFormDialog.open) resetDoctorForm();
    if (userDialog.open) userDialog.close();
    authScreen.hidden = false;
    appShell.hidden = true;
    authError.textContent = message || (API_BASE_URL ? "" : "Configure a URL da API publicada em config.js.");
    authError.hidden = !authError.textContent;
  }

  function copyRecords(records) {
    return records.map((record) => ({ ...record }));
  }

  function applyClinicSettings(settings) {
    const palettes = ["sage", "ocean", "violet", "terracotta", "rose"];
    clinicSettings = {
      palette: palettes.includes(settings?.palette) ? settings.palette : "sage",
      logo: typeof settings?.logo === "string" ? settings.logo : null
    };
    document.documentElement.dataset.palette = clinicSettings.palette;
    document.querySelectorAll('input[name="palette"]').forEach((input) => {
      input.checked = input.value === clinicSettings.palette;
    });
    const hasLogo = Boolean(clinicSettings.logo);
    clinicBrand.hidden = !hasLogo;
    clinicLogoMobile.hidden = !hasLogo;
    if (hasLogo) {
      clinicBrandLogo.src = clinicSettings.logo;
      clinicLogoMobile.src = clinicSettings.logo;
    } else {
      clinicBrandLogo.removeAttribute("src");
      clinicLogoMobile.removeAttribute("src");
    }
    renderClinicLogoPreview(clinicSettings.logo);
  }

  function renderClinicLogoPreview(logo) {
    appearanceLogoImage.hidden = !logo;
    appearanceLogoPlaceholder.hidden = Boolean(logo);
    removeClinicLogoButton.hidden = !logo;
    if (logo) appearanceLogoImage.src = logo;
    else appearanceLogoImage.removeAttribute("src");
  }

  async function compressClinicLogo(file) {
    if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      throw new Error("Escolha uma imagem JPG, PNG ou WebP.");
    }
    if (file.size > 4 * 1024 * 1024) throw new Error("A imagem deve ter no máximo 4 MB.");
    const image = await createImageBitmap(file);
    try {
      const scale = Math.min(1, 480 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Não foi possível preparar a imagem da logo neste navegador.");
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      let dataUrl = canvas.toDataURL("image/webp", 0.88);
      if (!dataUrl.startsWith("data:image/webp")) dataUrl = canvas.toDataURL("image/png");
      if (dataUrl.length > 700000) throw new Error("A imagem ficou muito grande mesmo após a redução. Escolha um arquivo menor.");
      return dataUrl;
    } finally {
      image.close();
    }
  }

  async function loadUsers() {
    userList.replaceChildren();
    userListMessage.textContent = "Carregando usuários...";
    userListMessage.hidden = false;
    try {
      const result = await apiRequest("/api/users");
      userListMessage.hidden = true;
      userList.replaceChildren();
      for (const user of result.users) {
        const row = document.createElement("article");
        row.className = "user-list-row";
        const details = document.createElement("div");
        details.className = "user-list-details";
        const email = document.createElement("strong");
        email.textContent = user.email;
        const role = document.createElement("span");
        const roleNames = { owner: "Administrador", attendant: "Atendente", doctor: "Médico" };
        const linkedDoctor = doctors.find((doctor) => doctor.id === user.doctorId);
        role.textContent = user.role === "doctor" && linkedDoctor
          ? `Médico · ${linkedDoctor.name}`
          : roleNames[user.role] || user.role;
        details.append(email, role);
        row.append(details);
        if (user.role !== "owner") {
          const actions = document.createElement("div");
          actions.className = "user-list-actions";
          const editButton = document.createElement("button");
          editButton.className = "button button-outline";
          editButton.type = "button";
          editButton.textContent = "Editar";
          editButton.addEventListener("click", () => beginUserEdit(user));
          const deleteButton = document.createElement("button");
          deleteButton.className = "button button-text user-delete-button";
          deleteButton.type = "button";
          deleteButton.textContent = "Excluir";
          deleteButton.addEventListener("click", () => { void deleteUser(user); });
          actions.append(editButton, deleteButton);
          row.append(actions);
        }
        userList.append(row);
      }
      if (!result.users.length) {
        userListMessage.textContent = "Nenhum usuário cadastrado.";
        userListMessage.hidden = false;
      }
    } catch (error) {
      console.error("Não foi possível carregar os usuários.", error);
      userListMessage.textContent = error.message;
      userListMessage.hidden = false;
    }
  }

  function beginUserCreate() {
    editingUserId = "";
    userForm.reset();
    userFormError.hidden = true;
    userFormTitle.textContent = "Adicionar usuário";
    userFormDescription.textContent = "Compartilhe a senha temporária com o usuário por um canal seguro.";
    newUserPasswordField.hidden = false;
    newUserPassword.required = true;
    editUserPasswordField.hidden = true;
    userListSection.hidden = true;
    userForm.hidden = false;
    saveUserButton.textContent = "Criar usuário";
    renderDoctorOptions();
    updateNewUserRoleFields();
  }

  function beginUserEdit(user) {
    editingUserId = user.id;
    userForm.reset();
    userFormError.hidden = true;
    document.getElementById("new-user-email").value = user.email;
    newUserRole.value = user.role;
    newUserPasswordField.hidden = true;
    newUserPassword.required = false;
    editUserPasswordField.hidden = false;
    userFormTitle.textContent = "Editar usuário";
    userFormDescription.textContent = "A conta administradora é protegida. Deixe a senha em branco para mantê-la.";
    saveUserButton.textContent = "Salvar alterações";
    userListSection.hidden = true;
    userForm.hidden = false;
    renderDoctorOptions();
    newUserDoctor.value = user.doctorId || "";
    updateNewUserRoleFields();
  }

  function cancelUserForm() {
    userForm.hidden = true;
    userListSection.hidden = false;
    editingUserId = "";
    userFormError.hidden = true;
    userForm.reset();
  }

  async function deleteUser(user) {
    if (!window.confirm(`Excluir o acesso de ${user.email}? Esta ação não pode ser desfeita.`)) return;
    try {
      await apiRequest(`/api/users/${encodeURIComponent(user.id)}`, { method: "DELETE" });
      showToast("Usuário excluído.");
      await loadUsers();
    } catch (error) {
      console.error("Não foi possível excluir o usuário.", error);
      userListMessage.textContent = error.message;
      userListMessage.hidden = false;
    }
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
    setActiveView("agenda");
    const [state, appearance] = await Promise.all([
      apiRequest("/api/state"),
      apiRequest("/api/clinic/settings")
    ]);
    applyClinicSettings(appearance.settings);
    appointments = Array.isArray(state.appointments) ? state.appointments : [];
    doctors = Array.isArray(state.doctors) ? state.doctors : [];
    cloudSnapshots.appointments = copyRecords(appointments);
    cloudSnapshots.doctors = copyRecords(doctors);
    medicalRecords = currentUserRole === "doctor"
      ? new Map((await apiRequest("/api/medical-records")).records.map((record) => [record.appointmentId, record]))
      : new Map();

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
    document.querySelectorAll('[data-role="doctor"]').forEach((link) => {
      link.hidden = currentUserRole !== "doctor";
    });
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
      currentUserDoctorId = session.user.doctorId || "";
      await loadCloudState();
    } catch (error) {
      console.error("Não foi possível iniciar a sessão do AgendeAqui.", error);
      authToken = "";
      currentUserRole = "";
      currentUserDoctorId = "";
      sessionStorage.removeItem(TOKEN_KEY);
      showLogin(error.message);
    }
  }

  async function refreshCloudState() {
    if (!authToken || pendingSaves || syncing || detailsDialog.open
      || appointmentFormDialog.open || appearanceDialog.open || userDialog.open
      || document.getElementById("doctor-id").value
      || activeView === "medical-records") return;
    syncing = true;
    try {
      const state = await apiRequest("/api/state");
      const appearance = await apiRequest("/api/clinic/settings");
      applyClinicSettings(appearance.settings);
      appointments = Array.isArray(state.appointments) ? state.appointments : [];
      doctors = Array.isArray(state.doctors) ? state.doctors : [];
      cloudSnapshots.appointments = copyRecords(appointments);
      cloudSnapshots.doctors = copyRecords(doctors);
      if (currentUserRole === "doctor") {
        const result = await apiRequest("/api/medical-records");
        medicalRecords = new Map(result.records.map((record) => [record.appointmentId, record]));
      }
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
      version: 2,
      exportedAt: new Date().toISOString(),
      doctors,
      appointments,
      ...(currentUserRole === "doctor" ? { medicalRecords: [...medicalRecords.values()] } : {})
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
    showToast(currentUserRole === "doctor"
      ? "Arquivo JSON com agenda e prontuários do seu cadastro exportado."
      : "Arquivo JSON com médicos e consultas exportado.");
  }

  function showToast(message) {
    if (doctorFormDialog.open) {
      doctorFormError.textContent = message;
      doctorFormError.hidden = false;
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => { doctorFormError.hidden = true; }, 5000);
      return;
    }
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

  function updateDoctorPhotoPreview() {
    const hasPhoto = /^data:image\/jpeg;base64,/.test(doctorPhotoData);
    doctorPhotoImage.hidden = !hasPhoto;
    doctorPhotoPlaceholder.hidden = hasPhoto;
    removeDoctorPhotoButton.hidden = !hasPhoto;
    if (hasPhoto) doctorPhotoImage.src = doctorPhotoData;
    else doctorPhotoImage.removeAttribute("src");
  }

  function processDoctorPhoto(file) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(file);
      image.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const maxDimension = 512;
        const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          reject(new Error("Não foi possível processar a foto neste navegador."));
          return;
        }
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.78);
        if (dataUrl.length > 500_000) {
          reject(new Error("A foto ficou muito grande após a compressão. Escolha outra imagem."));
          return;
        }
        resolve(dataUrl);
      };
      image.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("Não foi possível abrir essa imagem. Escolha um arquivo JPG, PNG ou WebP válido."));
      };
      image.src = objectUrl;
    });
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
      ? doctors.slice().sort((first, second) => first.name.localeCompare(second.name, "pt-BR")).map((doctor) => {
        const photo = /^data:image\/jpeg;base64,/.test(doctor.photo || "")
          ? `<img class="doctor-list-photo" src="${escapeHTML(doctor.photo)}" alt="Foto de ${escapeHTML(doctor.name)}">`
          : `<span class="doctor-list-avatar" aria-hidden="true">${escapeHTML(initials(doctor.name) || "M")}</span>`;
        return `<article class="doctor-list-item">
          ${photo}
          <div class="doctor-list-info">
            <strong>${escapeHTML(doctor.name)}</strong>
            <span>${escapeHTML(doctor.specialty || "Especialidade não informada")}</span>
            <small>${escapeHTML(doctor.cellphone || "Celular não informado")} · ${escapeHTML(doctorDaysLabel(doctor) || "Sem dias configurados")}</small>
          </div>
          <div class="doctor-list-actions">
            <button class="button button-outline" type="button" data-edit-doctor="${escapeHTML(doctor.id)}">Editar</button>
            <button class="button button-outline doctor-delete-button" type="button" data-delete-doctor="${escapeHTML(doctor.id)}">Excluir</button>
          </div>
        </article>`;
      }).join("")
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
    const selectedUserDoctorId = newUserDoctor.value;
    newUserDoctor.innerHTML = `<option value="">Selecione o médico</option>${options}`;
    newUserDoctor.value = doctors.some((doctor) => doctor.id === selectedUserDoctorId) ? selectedUserDoctorId : "";
    newUserDoctor.disabled = doctors.length === 0;

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

  function renderMedicalRecordForm() {
    const appointmentId = medicalRecordAppointment.value;
    const appointment = appointments.find((item) => item.id === appointmentId
      && item.doctorId === currentUserDoctorId);
    const record = appointment ? medicalRecords.get(appointment.id) : null;
    medicalRecordPatient.hidden = !appointment;
    medicalRecordForm.hidden = !appointment;
    medicalRecordEmpty.hidden = Boolean(appointment);
    if (!appointment) {
      medicalRecordPatient.textContent = "";
      medicalRecordUpdated.textContent = "";
      return;
    }

    medicalRecordPatient.textContent = `${appointment.patientName} · ${formatDate(appointment.date)} às ${appointment.time} · ${appointment.type || "Consulta"}`;
    for (const field of medicalRecordForm.querySelectorAll("textarea[name]")) {
      field.value = record?.content?.[field.name] || "";
    }
    medicalRecordUpdated.textContent = record?.updatedAt
      ? `Última atualização: ${formatTimestamp(record.updatedAt)}`
      : "Ainda não há registro clínico para esta consulta.";
  }

  function renderMedicalRecords() {
    const selectedId = medicalRecordAppointment.value;
    const doctorAppointments = appointments
      .filter((appointment) => appointment.doctorId === currentUserDoctorId)
      .slice()
      .sort((first, second) => `${second.date || ""} ${second.time || ""}`.localeCompare(`${first.date || ""} ${first.time || ""}`));
    medicalRecordAppointment.innerHTML = doctorAppointments.length
      ? doctorAppointments.map((appointment) => `<option value="${escapeHTML(appointment.id)}">${escapeHTML(appointment.patientName)} · ${escapeHTML(formatDate(appointment.date))} ${escapeHTML(appointment.time)}</option>`).join("")
      : '<option value="">Nenhuma consulta vinculada</option>';
    medicalRecordAppointment.disabled = doctorAppointments.length === 0;
    medicalRecordEmpty.textContent = doctorAppointments.length
      ? "Selecione uma consulta para consultar ou preencher o prontuário."
      : "Não há consultas associadas ao seu usuário médico.";
    medicalRecordAppointment.value = doctorAppointments.some((appointment) => appointment.id === selectedId)
      ? selectedId
      : (doctorAppointments[0]?.id || "");
    renderMedicalRecordForm();
  }

  function updateNewUserRoleFields() {
    const isDoctor = newUserRole.value === "doctor";
    newUserDoctorField.hidden = !isDoctor;
    newUserDoctor.required = isDoctor;
    newUserDoctor.disabled = !isDoctor || doctors.length === 0;
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
    const arrival = appointment.arrivalAt ? new Date(appointment.arrivalAt) : null;
    const arrived = arrival && !Number.isNaN(arrival.getTime());
    const checkin = arrived
      ? `<button class="button checkin-button is-checked-in" type="button" data-action="checkin" data-id="${escapeHTML(appointment.id)}" disabled>✓ Chegou</button><small class="waiting-time" data-arrival-at="${escapeHTML(appointment.arrivalAt)}"></small>`
      : `<button class="button button-outline checkin-button" type="button" data-action="checkin" data-id="${escapeHTML(appointment.id)}">＋ Check-in</button>`;
    const whatsapp = currentUserRole === "doctor"
      ? ""
      : renderAppointmentWhatsApp(appointment);
    return `<tr class="appointment-row" data-id="${escapeHTML(appointment.id)}" tabindex="0" title="Clique para ver os detalhes">
      <td><div class="patient-cell"><span class="patient-avatar">${escapeHTML(initials(appointment.patientName))}</span><span><strong class="patient-name">${escapeHTML(appointment.patientName)}</strong><small class="patient-phone">${escapeHTML(appointment.patientPhone)}</small></span></div></td>
      <td><span class="date-cell"><strong>${escapeHTML(formatDate(appointment.date))}</strong><span>${escapeHTML(appointment.time)}</span></span></td>
      <td>${escapeHTML(appointmentDoctor(appointment)?.name || appointment.doctorName || "—")}</td>
      <td><span class="type-label">${escapeHTML(appointment.type)}</span></td>
      <td><span class="payment-cell"><strong>${escapeHTML(formatCurrency(paymentValue))}</strong><span>${escapeHTML(paymentLine)}</span></span></td>
      <td><span class="status-badge ${statusClass(appointment.status)}">${escapeHTML(appointment.status)}</span></td>
      <td><div class="checkin-cell">${checkin}</div></td>
      <td><div class="row-actions">${whatsapp}<button class="icon-button" type="button" data-action="edit" data-id="${escapeHTML(appointment.id)}" aria-label="Editar consulta de ${escapeHTML(appointment.patientName)}" title="Editar">✎</button><button class="icon-button delete" type="button" data-action="delete" data-id="${escapeHTML(appointment.id)}" aria-label="Excluir consulta de ${escapeHTML(appointment.patientName)}" title="Excluir">×</button></div></td>
    </tr>`;
  }

  function renderAppointmentWhatsApp(appointment) {
    const phone = normalizeBrazilPhone(appointment.patientPhone);
    if (!phone) return '<span class="whatsapp-unavailable">Telefone inválido para WhatsApp</span>';
    const doctorName = appointmentDoctor(appointment)?.name || appointment.doctorName;
    const doctorLine = doctorName ? ` com ${doctorName}` : "";
    const message = `Olá, ${appointment.patientName}! Podemos confirmar sua consulta${doctorLine}, marcada para ${formatLongDate(appointment.date)} às ${appointment.time}?`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    return `<a class="button button-whatsapp appointment-whatsapp" href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer" aria-label="Confirmar consulta de ${escapeHTML(appointment.patientName)} pelo WhatsApp">↗ WhatsApp</a>`;
  }

  function updateWaitingTimeDisplays() {
    document.querySelectorAll(".waiting-time[data-arrival-at]").forEach((display) => {
      const arrival = new Date(display.dataset.arrivalAt);
      if (Number.isNaN(arrival.getTime())) {
        display.textContent = "Horário de chegada inválido";
        return;
      }
      const waitingMinutes = Math.max(0, Math.floor((Date.now() - arrival.getTime()) / 60000));
      const hours = String(Math.floor(waitingMinutes / 60)).padStart(2, "0");
      const minutes = String(waitingMinutes % 60).padStart(2, "0");
      display.textContent = `Chegada ${arrival.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} · espera ${hours}:${minutes}`;
    });
  }
  window.setInterval(updateWaitingTimeDisplays, 15000);

  async function registerAppointmentCheckin(id) {
    const index = appointments.findIndex((appointment) => appointment.id === id);
    if (index < 0) {
      showToast("Esta consulta não foi encontrada.");
      return;
    }
    if (appointments[index].arrivalAt) return;
    const previous = appointments;
    const arrivalAt = new Date().toISOString();
    appointments = appointments.map((appointment, appointmentIndex) => (
      appointmentIndex === index ? { ...appointment, arrivalAt } : appointment
    ));
    if (!(await saveAppointments())) {
      appointments = previous;
      return;
    }
    render();
    const checkedInAppointment = appointments[index];
    showToast(`Check-in de ${checkedInAppointment.patientName} registrado às ${new Date(arrivalAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`);
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
    updateWaitingTimeDisplays();
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
    renderMedicalRecords();
    if (currentUserRole === "doctor") renderFinancialData();
  }

  function setActiveView(view) {
    if (["financial", "medical-records"].includes(view) && currentUserRole !== "doctor") {
      showToast("Esta área está disponível apenas para usuários médicos.");
      view = "agenda";
    }
    activeView = view;
    const isCalendar = view === "calendar";
    const isDoctors = view === "doctors";
    const isFinancial = view === "financial";
    const isMedicalRecords = view === "medical-records";
    appointmentsPanel.hidden = isCalendar || isDoctors || isFinancial || isMedicalRecords;
    calendarPanel.hidden = !isCalendar;
    doctorsPanel.hidden = !isDoctors;
    financialPanel.hidden = !isFinancial;
    medicalRecordsPanel.hidden = !isMedicalRecords;
    statsGrid.hidden = view !== "agenda";
    document.getElementById("new-appointment").hidden = view !== "agenda";
    pageTitle.textContent = isCalendar ? "Minha Agenda" : isDoctors ? "Médicos" : isFinancial ? "Dados financeiros" : isMedicalRecords ? "Prontuário do paciente" : "Agenda de consultas";
    pageSubtitle.textContent = isCalendar
      ? "Visualize separadamente a agenda e os horários de cada médico."
      : isDoctors
        ? "Cadastre os profissionais e configure os horários do consultório."
        : isFinancial
          ? "Acompanhe valores recebidos e pagamentos pendentes."
          : isMedicalRecords
            ? "Consulte e registre informações clínicas das suas consultas."
          : "Cadastre e acompanhe os agendamentos do consultório.";
    document.querySelectorAll("[data-view]").forEach((link) => {
      const active = link.dataset.view === view;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    if (isCalendar) renderCalendar();
    if (isFinancial) renderFinancialData();
    if (isMedicalRecords) renderMedicalRecords();
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
    doctorPhotoData = /^data:image\/jpeg;base64,/.test(doctor.photo || "") ? doctor.photo : "";
    doctorPhotoInput.value = "";
    updateDoctorPhotoPreview();
    const specialtyInput = document.getElementById("doctor-specialty");
    specialtyInput.querySelectorAll("[data-legacy-specialty]").forEach((option) => option.remove());
    if (doctor.specialty && ![...specialtyInput.options].some((option) => option.value === doctor.specialty)) {
      const legacyOption = new Option(`${doctor.specialty} (cadastro existente)`, doctor.specialty);
      legacyOption.dataset.legacySpecialty = "true";
      specialtyInput.add(legacyOption);
    }
    specialtyInput.value = doctor.specialty || "";
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
    doctorFormError.hidden = true;
    doctorFormDialog.showModal();
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
    doctorPhotoData = "";
    doctorPhotoInput.value = "";
    updateDoctorPhotoPreview();
    document.getElementById("doctor-specialty").querySelectorAll("[data-legacy-specialty]").forEach((option) => option.remove());
    doctorFormError.hidden = true;
    renderDoctorWeeklySchedule();
    doctorInsuranceList.replaceChildren();
    doctorProcedureList.replaceChildren();
    document.getElementById("doctors-title").textContent = "Cadastrar médico";
    document.getElementById("doctor-form-description").textContent = "Cadastre os profissionais e configure dias, horários, duração e valor das consultas.";
    document.getElementById("save-doctor-button").innerHTML = '<span aria-hidden="true">＋</span> Salvar médico';
    document.getElementById("cancel-doctor-edit").hidden = true;
    if (doctorFormDialog.open) doctorFormDialog.close();
  }

  doctorForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (doctorPhotoProcessing) {
      showToast("Aguarde o processamento da foto antes de salvar o médico.");
      return;
    }
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
      photo: doctorPhotoData,
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
      if (button.dataset.action === "checkin") registerAppointmentCheckin(button.dataset.id);
      return;
    }
    if (event.target.closest("a")) return;
    const row = event.target.closest("tr[data-id]");
    if (row) openDetails(row.dataset.id);
  });

  list.addEventListener("keydown", (event) => {
    if ((event.key !== "Enter" && event.key !== " ") || event.target.closest("button, a")) return;
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
  doctorPhotoInput.addEventListener("change", async () => {
    const file = doctorPhotoInput.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      doctorPhotoInput.value = "";
      showToast("Escolha uma imagem JPG, PNG ou WebP.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      doctorPhotoInput.value = "";
      showToast("A foto deve ter no máximo 8 MB antes da compressão.");
      return;
    }
    doctorPhotoProcessing = true;
    document.getElementById("save-doctor-button").disabled = true;
    try {
      doctorPhotoData = await processDoctorPhoto(file);
      updateDoctorPhotoPreview();
    } catch (error) {
      console.error("Não foi possível processar a foto do médico.", error);
      showToast(error.message);
    } finally {
      doctorPhotoInput.value = "";
      doctorPhotoProcessing = false;
      document.getElementById("save-doctor-button").disabled = false;
    }
  });
  removeDoctorPhotoButton.addEventListener("click", () => {
    doctorPhotoData = "";
    updateDoctorPhotoPreview();
  });
  document.getElementById("add-doctor").addEventListener("click", () => {
    resetDoctorForm();
    doctorFormDialog.showModal();
    document.getElementById("doctor-full-name").focus({ preventScroll: true });
  });
  document.getElementById("close-doctor-form").addEventListener("click", resetDoctorForm);
  doctorFormDialog.addEventListener("click", (event) => {
    if (event.target === doctorFormDialog) resetDoctorForm();
  });
  doctorFormDialog.addEventListener("close", () => {
    if (document.getElementById("doctor-id").value || !doctorFormError.hidden) resetDoctorForm();
  });
  doctorForm.addEventListener("input", () => { doctorFormError.hidden = true; });
  doctorForm.addEventListener("change", () => { doctorFormError.hidden = true; });
  document.getElementById("empty-new-appointment").addEventListener("click", () => openAppointmentForm());
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
  manageUsersButton.addEventListener("click", () => {
    cancelUserForm();
    userDialog.showModal();
    void loadUsers();
  });
  document.getElementById("start-user-create").addEventListener("click", beginUserCreate);
  document.getElementById("close-user-dialog").addEventListener("click", () => userDialog.close());
  document.getElementById("cancel-user-create").addEventListener("click", cancelUserForm);
  userDialog.addEventListener("click", (event) => {
    if (event.target === userDialog) userDialog.close();
  });
  newUserRole.addEventListener("change", updateNewUserRoleFields);
  userForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!userForm.reportValidity()) return;
    if (newUserRole.value === "doctor" && !newUserDoctor.value) {
      showToast("Cadastre ou selecione um médico para vincular à conta.");
      return;
    }
    saveUserButton.disabled = true;
    userFormError.hidden = true;
    try {
      const requestBody = {
        email: document.getElementById("new-user-email").value.trim(),
        password: editingUserId ? editUserPassword.value : newUserPassword.value,
        role: newUserRole.value,
        doctorId: newUserRole.value === "doctor" ? newUserDoctor.value : null
      };
      await apiRequest(editingUserId ? `/api/users/${encodeURIComponent(editingUserId)}` : "/api/users", {
        method: editingUserId ? "PATCH" : "POST",
        body: JSON.stringify(requestBody)
      });
      const wasEditing = Boolean(editingUserId);
      cancelUserForm();
      await loadUsers();
      showToast(wasEditing ? "Usuário atualizado." : "Usuário criado. Compartilhe as credenciais por um canal seguro.");
    } catch (error) {
      console.error("Não foi possível salvar o usuário.", error);
      userFormError.textContent = error.message;
      userFormError.hidden = false;
    } finally {
      saveUserButton.disabled = false;
    }
  });
  document.getElementById("open-appearance").addEventListener("click", () => {
    appearanceError.hidden = true;
    draftClinicLogo = clinicSettings.logo;
    renderClinicLogoPreview(draftClinicLogo);
    appearanceDialog.showModal();
  });
  document.getElementById("close-appearance").addEventListener("click", () => appearanceDialog.close());
  document.getElementById("cancel-appearance").addEventListener("click", () => appearanceDialog.close());
  appearanceDialog.addEventListener("click", (event) => {
    if (event.target === appearanceDialog) appearanceDialog.close();
  });
  clinicLogoInput.addEventListener("change", async () => {
    const file = clinicLogoInput.files?.[0];
    if (!file) return;
    appearanceError.hidden = true;
    try {
      draftClinicLogo = await compressClinicLogo(file);
      renderClinicLogoPreview(draftClinicLogo);
    } catch (error) {
      console.error("Não foi possível processar a logo da clínica.", error);
      appearanceError.textContent = error.message;
      appearanceError.hidden = false;
      clinicLogoInput.value = "";
    }
  });
  removeClinicLogoButton.addEventListener("click", () => {
    draftClinicLogo = null;
    clinicLogoInput.value = "";
    renderClinicLogoPreview(null);
  });
  appearanceForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const palette = appearanceForm.querySelector('input[name="palette"]:checked')?.value;
    const submitButton = document.getElementById("save-appearance");
    submitButton.disabled = true;
    appearanceError.hidden = true;
    try {
      const result = await apiRequest("/api/clinic/settings", {
        method: "PUT",
        body: JSON.stringify({ palette, logo: draftClinicLogo })
      });
      applyClinicSettings(result.settings);
      appearanceDialog.close();
      showToast("A identidade visual da clínica foi salva.");
    } catch (error) {
      console.error("Não foi possível salvar a aparência da clínica.", error);
      appearanceError.textContent = error.message;
      appearanceError.hidden = false;
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
      currentUserDoctorId = result.user.doctorId || "";
      sessionStorage.setItem(TOKEN_KEY, authToken);
      await loadCloudState();
      loginPassword.value = "";
    } catch (error) {
      console.error("Não foi possível entrar no AgendeAqui.", error);
      authToken = "";
      currentUserRole = "";
      currentUserDoctorId = "";
      applyClinicSettings({ palette: "sage", logo: null });
      sessionStorage.removeItem(TOKEN_KEY);
      showLogin(error.message);
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = "Entrar";
    }
  });
  document.getElementById("logout-button").addEventListener("click", () => {
    authToken = "";
    currentUserRole = "";
    currentUserDoctorId = "";
    applyClinicSettings({ palette: "sage", logo: null });
    sessionStorage.removeItem(TOKEN_KEY);
    appointments = [];
    doctors = [];
    medicalRecords = new Map();
    cloudSnapshots.appointments = [];
    cloudSnapshots.doctors = [];
    document.querySelectorAll('[data-role="doctor"]').forEach((link) => { link.hidden = true; });
    setActiveView("agenda");
    showLogin();
  });
  medicalRecordAppointment.addEventListener("change", renderMedicalRecordForm);
  medicalRecordForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const appointmentId = medicalRecordAppointment.value;
    if (!appointmentId || !appointments.some((appointment) => appointment.id === appointmentId
      && appointment.doctorId === currentUserDoctorId)) {
      showToast("Selecione uma consulta da sua agenda.");
      return;
    }
    const submitButton = document.getElementById("save-medical-record");
    const content = Object.fromEntries(
      [...medicalRecordForm.querySelectorAll("textarea[name]")].map((field) => [field.name, field.value.trim()])
    );
    submitButton.disabled = true;
    try {
      const result = await apiRequest(`/api/medical-records/${encodeURIComponent(appointmentId)}`, {
        method: "PUT",
        body: JSON.stringify(content)
      });
      medicalRecords.set(result.record.appointmentId, result.record);
      renderMedicalRecordForm();
      showToast("Prontuário salvo com segurança na nuvem.");
    } catch (error) {
      console.error("Não foi possível salvar o prontuário.", error);
      showToast(error.message);
    } finally {
      submitButton.disabled = false;
    }
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
